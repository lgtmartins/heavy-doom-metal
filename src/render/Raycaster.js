// ============================================================================
// Raycaster: o "motor 3D" do jogo, no estilo Wolfenstein/Doom.
//
// O mundo é um mapa 2D em grade. Para cada coluna da tela lançamos um raio; a
// distância até a parede define a altura da fatia de parede desenhada. O chão é
// calculado linha por linha e os sprites (inimigos, itens, projéteis) são
// "billboards": imagens sempre viradas para a câmera, escaladas pela distância
// e recortadas pelo z-buffer das paredes.
//
// Tudo é pintado num Uint32Array (1 inteiro = 1 pixel ABGR) e a cena do Phaser
// só copia esse buffer para uma textura a cada quadro.
// ============================================================================
import { VISTA_L as W, VISTA_A as H, FOV, ALTURA_PAREDE, PX_POR_UNIDADE } from '../config.js';

const TAN_MEIO = Math.tan(FOV / 2);
const FOCAL = (W / 2) / TAN_MEIO;      // distância do "plano de projeção" em pixels
const MAX_SPRITES = 3072;
const PROF_MIN = 0.15;

/** Escurece a cor `c` pelo fator s (0..256). Os canais R/B e G são multiplicados em paralelo. */
function sombrear(c, s) {
  return (0xff000000 | ((((c & 0xff00ff) * s) >>> 8) & 0xff00ff) | ((((c & 0x00ff00) * s) >>> 8) & 0x00ff00)) >>> 0;
}

// Dígitos 3x5 dos números de dano (cada linha é um número binário de 3 bits).
const DIGITOS = [
  [7, 5, 5, 5, 7], [2, 6, 2, 2, 7], [7, 1, 7, 4, 7], [7, 1, 7, 1, 7], [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 7], [7, 4, 7, 5, 7], [7, 1, 1, 1, 1], [7, 5, 7, 5, 7], [7, 5, 7, 1, 7],
];

export class Raycaster {
  constructor(mapa, texturas, ceu) {
    this.mapa = mapa;
    this.tex = texturas;
    this.ceu = ceu;
    this.imagem = new ImageData(W, H);
    this.buf = new Uint32Array(this.imagem.data.buffer);
    this.zbuf = new Float32Array(W);

    // Lista de sprites do quadro. Os objetos são criados uma vez e reutilizados
    // (pooling): nada de alocar memória a cada quadro.
    this.itens = Array.from({ length: MAX_SPRITES }, () => ({
      q: null, x: 0, y: 0, z: 0, esc: 1, centro: false, brilho: false, flash: false, espelho: false, tom: 0, prof: 0,
    }));
    this.n = 0;
    this.visiveis = [];

    this.cam = { x: 0, y: 0, cos: 1, sin: 0, olho: 0.64, hz: H / 2 };
    this.luzExtra = 0;      // clarão do tiro: clareia a cena inteira por um instante
    this.invertido = false; // efeito da invulnerabilidade (paleta invertida, como no Doom)

    // ângulo de cada coluna em relação ao centro da tela (usado pelo céu)
    this.angColuna = new Float32Array(W);
    for (let x = 0; x < W; x++) this.angColuna[x] = Math.atan(((2 * (x + 0.5)) / W - 1) * TAN_MEIO);
  }

  /** Começa um quadro novo: esvazia a lista de sprites. */
  limpar() { this.n = 0; }

  /**
   * Agenda um sprite para o quadro.
   * z = altura da BASE do sprite (ou do CENTRO, se `centro` for true), em unidades.
   */
  sprite(q, x, y, z, esc = 1, centro = false, brilho = false, flash = false, espelho = false, tom = 0) {
    if (this.n >= MAX_SPRITES) return;
    const it = this.itens[this.n++];
    it.q = q; it.x = x; it.y = y; it.z = z; it.esc = esc;
    it.centro = centro; it.brilho = brilho; it.flash = flash; it.espelho = espelho; it.tom = tom;
  }

  luz(dist) {
    const s = ((1.1 - dist / 24) * 256 + this.luzExtra) | 0;
    return s < 60 ? 60 : s > 256 ? 256 : s;
  }

  /** Desenha o quadro inteiro. cam = { x, y, ang, olho, deslocY } */
  desenhar(camera) {
    const { buf, zbuf, mapa, cam } = this;
    const cos = Math.cos(camera.ang), sin = Math.sin(camera.ang);
    const plX = -sin * TAN_MEIO, plY = cos * TAN_MEIO; // vetor do plano da câmera (aponta para a direita)
    const hz = Math.round(H / 2 + (camera.deslocY || 0));
    const olho = camera.olho;
    cam.x = camera.x; cam.y = camera.y; cam.cos = cos; cam.sin = sin; cam.olho = olho; cam.hz = hz;

    // ---- 1. céu: a textura dá 4 voltas em 360 graus, igual ao Doom
    const ceu = this.ceu;
    // quantas vezes a textura do céu se repete numa volta completa (o céu do Doom: 4)
    const voltas = (ceu.w * (ceu.repeticoes || 4)) / (Math.PI * 2);
    const yCeu = Math.min(hz, H);
    for (let x = 0; x < W; x++) {
      let tx = Math.floor((camera.ang + this.angColuna[x]) * voltas) % ceu.w;
      if (tx < 0) tx += ceu.w;
      for (let y = 0; y < yCeu; y++) {
        let ty = ceu.h - (hz - y);
        if (ty < 0) ty = 0;
        buf[y * W + x] = ceu.px[ty * ceu.w + tx];
      }
    }

    // ---- 2. chão: para cada linha abaixo do horizonte, todos os pixels estão à mesma distância
    const ml = mapa.l, ma = mapa.a, piso = mapa.piso, pisos = this.tex.pisos;
    for (let y = Math.max(hz + 1, 0); y < H; y++) {
      const dist = (olho * FOCAL) / (y - hz);
      const s = this.luz(dist);
      let fx = camera.x + dist * (cos - plX), fy = camera.y + dist * (sin - plY);
      const px = (dist * 2 * plX) / W, py = (dist * 2 * plY) / W;
      let i = y * W;
      for (let x = 0; x < W; x++, i++, fx += px, fy += py) {
        if (fx < 0 || fy < 0 || fx >= ml || fy >= ma) { buf[i] = 0xff000000; continue; }
        const cx = fx | 0, cy = fy | 0;
        const t = pisos[piso[cy * ml + cx]].px;
        buf[i] = sombrear(t[(((fy - cy) * 64) | 0) * 64 + (((fx - cx) * 64) | 0)], s);
      }
    }

    // ---- 3. paredes: um raio por coluna
    const imp = mapa.impacto;
    for (let x = 0; x < W; x++) {
      const camX = (2 * (x + 0.5)) / W - 1;
      const rdx = cos + plX * camX, rdy = sin + plY * camX;
      // como (rdx, rdy) não é normalizado, a distância já sai perpendicular à
      // câmera: é isso que evita o efeito "olho de peixe".
      const d = Math.max(mapa.raio(camera.x, camera.y, rdx, rdy, 90), 0.02);
      zbuf[x] = d;
      if (!imp.tipo) continue;
      const tex = this.tex.paredes[imp.tipo].px;
      let wx = imp.lado === 0 ? camera.y + d * rdy : camera.x + d * rdx;
      wx -= Math.floor(wx);
      const texX = (wx * 64) | 0;
      const topo = hz - ((ALTURA_PAREDE - olho) * FOCAL) / d;
      const base = hz + (olho * FOCAL) / d;
      const y0 = Math.max(0, Math.ceil(topo)), y1 = Math.min(H, Math.ceil(base));
      const passo = 128 / (base - topo);
      let ty = (y0 - topo) * passo;
      let s = this.luz(d);
      if (imp.lado === 1) s = (s * 200) >> 8; // faces norte/sul mais escuras: dá volume
      for (let y = y0; y < y1; y++, ty += passo) buf[y * W + x] = sombrear(tex[((ty | 0) & 127) * 64 + texX], s);
    }

    // ---- 4. sprites, do mais distante para o mais próximo
    const vis = this.visiveis;
    vis.length = 0;
    for (let i = 0; i < this.n; i++) {
      const it = this.itens[i];
      it.prof = (it.x - camera.x) * cos + (it.y - camera.y) * sin;
      if (it.prof > PROF_MIN) vis.push(it);
    }
    vis.sort((a, b) => b.prof - a.prof);
    for (let i = 0; i < vis.length; i++) this.desenharSprite(vis[i]);

    if (this.invertido) {
      for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        const v = 255 - (((c & 255) * 77 + ((c >> 8) & 255) * 150 + ((c >> 16) & 255) * 29) >> 8);
        buf[i] = (0xff000000 | (v << 16) | (v << 8) | v) >>> 0;
      }
    }
  }

  desenharSprite(it) {
    const { buf, zbuf, cam } = this;
    const q = it.q, prof = it.prof;
    const lateral = -(it.x - cam.x) * cam.sin + (it.y - cam.y) * cam.cos;
    const k = (FOCAL / prof) * (it.esc / PX_POR_UNIDADE); // pixels de tela por pixel do sprite
    const lw = q.w * k, lh = q.h * k;
    if (lh < 0.6) return;
    const xTela = W / 2 + (lateral / prof) * FOCAL;
    let yBase = cam.hz + ((cam.olho - it.z) * FOCAL) / prof;
    if (it.centro) yBase += lh / 2;
    const x0 = xTela - lw / 2, y0 = yBase - lh;
    const xa = Math.max(0, Math.ceil(x0 - 0.5)), xb = Math.min(W, Math.ceil(x0 + lw - 0.5));
    const ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(H, Math.ceil(y0 + lh - 0.5));
    if (xa >= xb || ya >= yb) return;
    const inv = 1 / k;
    const w = q.w, hMax = q.h - 1, px = q.px;
    const s = it.brilho ? 256 : this.luz(prof);
    const { flash, tom, espelho } = it;
    for (let sx = xa; sx < xb; sx++) {
      if (prof >= zbuf[sx]) continue; // atrás da parede nessa coluna
      let tx = ((sx + 0.5 - x0) * inv) | 0;
      if (tx >= w) tx = w - 1;
      if (espelho) tx = w - 1 - tx;
      let ty = (ya + 0.5 - y0) * inv;
      for (let sy = ya; sy < yb; sy++, ty += inv) {
        let c = px[(ty > hMax ? hMax : ty | 0) * w + tx];
        if (c >>> 24 < 128) continue;
        if (flash) c = (((c >>> 1) & 0x7f7f7f) + 0x808080) | 0xff000000;
        else if (tom === 1) c = (c & 0xff0000ff) | ((c >>> 1) & 0x007f7f00);  // avermelhado
        else if (tom === 2) c = ((c >>> 1) & 0x7f7f7f) | 0xff000000;           // escurecido (cadáver)
        buf[sy * W + sx] = s === 256 ? c >>> 0 : sombrear(c, s);
      }
    }
  }

  /** Converte um ponto do mundo em coordenadas da vista. Devolve null se estiver atrás da câmera ou de uma parede. */
  projetar(x, y, z) {
    const { cam } = this;
    const rx = x - cam.x, ry = y - cam.y;
    const prof = rx * cam.cos + ry * cam.sin;
    if (prof < PROF_MIN) return null;
    const sx = W / 2 + ((-rx * cam.sin + ry * cam.cos) / prof) * FOCAL;
    if (sx < 0 || sx >= W || prof >= this.zbuf[sx | 0]) return null;
    return { x: sx, y: cam.hz + ((cam.olho - z) * FOCAL) / prof, prof };
  }

  /** Número de dano ancorado num ponto do mundo. `cor` é ABGR. */
  numero(x, y, z, valor, cor, escala = 1) {
    const p = this.projetar(x, y, z);
    if (!p) return;
    const txt = String(Math.max(0, Math.round(valor)));
    const larg = txt.length * 4 * escala - escala;
    let ox = Math.round(p.x - larg / 2);
    const oy = Math.round(p.y);
    for (let i = 0; i < txt.length; i++, ox += 4 * escala) {
      const g = DIGITOS[txt.charCodeAt(i) - 48];
      if (!g) continue;
      for (let passada = 0; passada < 2; passada++) { // 1ª passada: sombra preta deslocada; 2ª: o dígito
        const d = passada === 0 ? 1 : 0, c = passada === 0 ? 0xff000000 : cor;
        for (let gy = 0; gy < 5; gy++) {
          for (let gx = 0; gx < 3; gx++) {
            if (!(g[gy] & (4 >> gx))) continue;
            this.bloco(ox + gx * escala + d, oy + gy * escala + d, escala, c);
          }
        }
      }
    }
  }

  bloco(x, y, t, cor) {
    for (let j = 0; j < t; j++) {
      for (let i = 0; i < t; i++) {
        const px = x + i, py = y + j;
        if (px >= 0 && py >= 0 && px < W && py < H) this.buf[py * W + px] = cor;
      }
    }
  }

  // ------------------------------------------------------------------ radar
  // Em primeira pessoa não dá para ver quem vem pelas costas; o radar resolve.
  // Fica no canto superior direito, com "para cima" = para onde o jogador olha.

  radarFundo(cx, cy, r) {
    const { buf } = this;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d2 = x * x + y * y;
        if (d2 > r * r) continue;
        const i = (cy + y) * W + cx + x;
        buf[i] = d2 > (r - 1) * (r - 1) ? 0xff2020a0 : sombrear(buf[i], 90) + 0x00100000;
      }
    }
    this.bloco(cx, cy - 1, 1, 0xffffffff);
    this.bloco(cx - 1, cy, 3, 0xffffffff);
  }

  radarPonto(cx, cy, r, alcance, x, y, cor, tam) {
    const { cam } = this;
    const rx = x - cam.x, ry = y - cam.y;
    let frente = rx * cam.cos + ry * cam.sin, lado = -rx * cam.sin + ry * cam.cos;
    const d = Math.hypot(frente, lado);
    if (d > alcance) { // fora do alcance: gruda na borda para indicar a direção
      if (tam < 2) return;
      frente *= alcance / d; lado *= alcance / d;
    }
    const k = (r - 2) / alcance;
    this.bloco(Math.round(cx + lado * k) - (tam >> 1), Math.round(cy - frente * k) - (tam >> 1), tam, cor);
  }
}

export { FOCAL };
