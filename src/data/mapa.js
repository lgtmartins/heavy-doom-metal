// Definição da arena. Para mexer no cenário, edite BLOCOS e ZONAS_DE_PISO.
// Coordenadas em células; o valor `tipo` é o índice da textura (ver render/texturas.js).

export const MAPA_L = 44;
export const MAPA_A = 44;

export const INICIO_JOGADOR = { x: 22, y: 22, ang: -Math.PI / 2 };

const PILAR = 2, FERRO = 3;

/** Obstáculos internos: { x, y, l, a, tipo }. */
export const BLOCOS = [
  // 16 pilares 2x2 em grade, deixando corredores de 6 células
  ...[7, 15, 27, 35].flatMap(x => [7, 15, 27, 35].map(y => ({ x, y, l: 2, a: 2, tipo: PILAR }))),
  // quatro muros em volta do centro, para dar cobertura contra projéteis
  { x: 19, y: 11, l: 6, a: 1, tipo: FERRO },
  { x: 19, y: 32, l: 6, a: 1, tipo: FERRO },
  { x: 11, y: 19, l: 1, a: 6, tipo: FERRO },
  { x: 32, y: 19, l: 1, a: 6, tipo: FERRO },
  // cantos em "L" perto das bordas
  { x: 3, y: 21, l: 3, a: 1, tipo: FERRO }, { x: 38, y: 22, l: 3, a: 1, tipo: FERRO },
  { x: 21, y: 3, l: 1, a: 3, tipo: FERRO }, { x: 22, y: 38, l: 1, a: 3, tipo: FERRO },
];

/** Zonas de piso: { x, y, l, a, tipo } (0 tech, 1 inferno, 2 alerta). Depois vêm as manchas de lava. */
export const ZONAS_DE_PISO = [
  { x: 1, y: 21, l: 42, a: 2, tipo: 2 },
  { x: 21, y: 1, l: 2, a: 42, tipo: 2 },
];

/** Mapa em grade + as consultas de colisão usadas por todo o jogo. */
export class Mapa {
  constructor() {
    this.l = MAPA_L;
    this.a = MAPA_A;
    this.paredes = new Uint8Array(this.l * this.a);
    this.piso = new Uint8Array(this.l * this.a);

    for (let y = 0; y < this.a; y++) {
      for (let x = 0; x < this.l; x++) {
        const i = y * this.l + x;
        if (x === 0 || y === 0 || x === this.l - 1 || y === this.a - 1) this.paredes[i] = 1;
        // manchas de rocha infernal: quanto mais longe do centro, mais o inferno tomou a base
        const dx = x - this.l / 2, dy = y - this.a / 2;
        const onda = Math.sin(x * 0.55) + Math.cos(y * 0.47) + Math.sin((x + y) * 0.31);
        if (onda + Math.hypot(dx, dy) * 0.11 > 2.6) this.piso[i] = 1;
      }
    }
    for (const z of ZONAS_DE_PISO) this.preencher(this.piso, z);
    for (const b of BLOCOS) this.preencher(this.paredes, b);
  }

  preencher(grade, r) {
    for (let y = r.y; y < r.y + r.a; y++) for (let x = r.x; x < r.x + r.l; x++) grade[y * this.l + x] = r.tipo;
  }

  /** A célula que contém o ponto (x, y) é parede? Fora do mapa conta como parede. */
  solido(x, y) {
    if (x < 0 || y < 0 || x >= this.l || y >= this.a) return true;
    return this.paredes[(y | 0) * this.l + (x | 0)] !== 0;
  }

  /** Um círculo de raio r em (x, y) cabe sem encostar em parede? (testa o quadrado que o envolve) */
  livre(x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cy < 0 || cx >= this.l || cy >= this.a || this.paredes[cy * this.l + cx]) return false;
      }
    }
    return true;
  }

  /**
   * Move `ent` (precisa ter x, y, raio) tentando um eixo de cada vez: é isso que
   * faz a entidade deslizar ao longo da parede em vez de travar. Devolve true se bateu.
   */
  mover(ent, dx, dy) {
    let bateu = false;
    if (dx !== 0) {
      if (this.livre(ent.x + dx, ent.y, ent.raio)) ent.x += dx; else bateu = true;
    }
    if (dy !== 0) {
      if (this.livre(ent.x, ent.y + dy, ent.raio)) ent.y += dy; else bateu = true;
    }
    return bateu;
  }

  /**
   * Lança um raio pela grade (algoritmo DDA) e devolve a distância até a primeira parede.
   * Preenche `this.impacto` com detalhes, para quem precisar (o raycaster precisa).
   */
  raio(x, y, dx, dy, maxDist = 64) {
    let cx = Math.floor(x), cy = Math.floor(y);
    const passoX = dx < 0 ? -1 : 1, passoY = dy < 0 ? -1 : 1;
    const deltaX = dx === 0 ? 1e30 : Math.abs(1 / dx), deltaY = dy === 0 ? 1e30 : Math.abs(1 / dy);
    let ladoX = dx < 0 ? (x - cx) * deltaX : (cx + 1 - x) * deltaX;
    let ladoY = dy < 0 ? (y - cy) * deltaY : (cy + 1 - y) * deltaY;
    let lado = 0, dist = 0;
    const imp = this.impacto;
    for (;;) {
      if (ladoX < ladoY) { dist = ladoX; ladoX += deltaX; cx += passoX; lado = 0; }
      else { dist = ladoY; ladoY += deltaY; cy += passoY; lado = 1; }
      if (dist > maxDist) { imp.tipo = 0; imp.lado = lado; return maxDist; }
      if (cx < 0 || cy < 0 || cx >= this.l || cy >= this.a) { imp.tipo = 1; imp.lado = lado; return dist; }
      const t = this.paredes[cy * this.l + cx];
      if (t) { imp.tipo = t; imp.lado = lado; return dist; }
    }
  }

  /** Existe linha de visão livre entre os dois pontos? */
  visivel(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return true;
    return this.raio(x0, y0, dx / d, dy / d, d + 0.01) >= d;
  }
}
Mapa.prototype.impacto = { tipo: 0, lado: 0 };
