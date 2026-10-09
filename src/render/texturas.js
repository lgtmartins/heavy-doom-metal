// Texturas procedurais de parede e chão.
//
// O pack de assets não tem nenhuma textura de cenário, então elas são geradas por
// código no carregamento: paredes de 64x128 e pisos de 64x64, no clima "base
// tecnológica tomada pelo inferno". O gerador é semeado: o resultado é sempre igual.

const rgb = (r, g, b) => (0xff000000 | (Math.min(255, Math.max(0, b | 0)) << 16) | (Math.min(255, Math.max(0, g | 0)) << 8) | Math.min(255, Math.max(0, r | 0))) >>> 0;

function aleatorio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído de valor suave e repetível nas bordas (para as texturas emendarem sem costura). */
function criarRuido(semente, celulas, tamanho) {
  const rnd = aleatorio(semente);
  const grade = Array.from({ length: celulas * celulas }, () => rnd());
  return (x, y) => {
    const fx = (x / tamanho) * celulas, fy = (y / tamanho) * celulas;
    const x0 = Math.floor(fx) % celulas, y0 = Math.floor(fy) % celulas;
    const x1 = (x0 + 1) % celulas, y1 = (y0 + 1) % celulas;
    let tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const a = grade[y0 * celulas + x0], b = grade[y0 * celulas + x1];
    const c = grade[y1 * celulas + x0], d = grade[y1 * celulas + x1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function gerar(l, a, pintar) {
  const px = new Uint32Array(l * a);
  for (let y = 0; y < a; y++) for (let x = 0; x < l; x++) px[y * l + x] = pintar(x, y);
  return { l, a, px };
}

// ------------------------------------------------------------------ paredes

/** Parede externa: painéis de metal com rebites, faixa de alerta e base escura. */
function paredeBase() {
  const rnd = aleatorio(11), ruido = criarRuido(12, 8, 64);
  const sujeira = Array.from({ length: 64 * 128 }, () => rnd());
  return gerar(64, 128, (x, y) => {
    let v = 92 + ruido(x, y % 64) * 34 + sujeira[y * 64 + x] * 10;
    const px = x % 32, py = (y - 18) % 55;
    // faixa amarela e preta no topo
    if (y >= 6 && y < 16) {
      const listra = ((x + y) >> 3) & 1;
      return listra ? rgb(190 + v * 0.2, 150 + v * 0.15, 20) : rgb(28, 26, 24);
    }
    if (y < 6 || (y >= 16 && y < 18)) v *= 0.45;
    else if (y >= 118) v *= 0.5 - (y - 118) * 0.02;                 // rodapé
    else if (px === 0 || py === 0) v *= 0.42;                         // junta do painel
    else if (px === 1 || py === 1) v *= 1.22;                         // chanfro claro
    else if (px === 31 || py === 54) v *= 0.7;
    // rebites nos cantos dos painéis
    const rx = px < 16 ? px - 4 : px - 27, ry = py < 27 ? py - 4 : py - 50;
    if (y >= 18 && y < 118 && rx * rx + ry * ry <= 2) v = rx + ry < 0 ? v * 1.5 : v * 0.55;
    // escorrido de ferrugem
    const ferr = ruido(x * 3, y * 0.5) > 0.72 && y > 20 ? 1 : 0;
    return ferr ? rgb(v * 0.95, v * 0.62, v * 0.42) : rgb(v * 0.84, v * 0.86, v * 0.92);
  });
}

/** Pilar: tijolos de pedra avermelhada com uma fenda de luz no meio. */
function paredePilar() {
  const rnd = aleatorio(21), ruido = criarRuido(22, 8, 64);
  const grao = Array.from({ length: 64 * 128 }, () => rnd());
  return gerar(64, 128, (x, y) => {
    const fileira = y >> 4;
    const bx = (x + (fileira & 1) * 16) % 32, by = y % 16;
    let v = 70 + ruido(x, y % 64) * 50 + grao[y * 64 + x] * 14;
    v *= 0.85 + ((fileira * 37 + ((x + (fileira & 1) * 16) >> 5) * 91) % 7) * 0.035; // tom por tijolo
    if (bx === 0 || by === 0) v *= 0.35;
    else if (bx === 1 || by === 1) v *= 1.18;
    // fenda luminosa vertical
    const d = Math.abs(x - 31.5);
    if (y > 40 && y < 92 && d < 5) {
      if (d < 2.5) { const q = 200 + Math.sin(y * 0.9) * 40; return rgb(255, q, 60); }
      return rgb(150, 40, 10);
    }
    if (y > 36 && y < 96 && d < 9) v *= 0.5;
    return rgb(v * 1.15, v * 0.52, v * 0.42);
  });
}

/** Muro interno: chapa enferrujada com vigas verticais e uma caveira estampada. */
function paredeFerro() {
  const rnd = aleatorio(31), ruido = criarRuido(32, 6, 64), ruido2 = criarRuido(33, 16, 64);
  const grao = Array.from({ length: 64 * 128 }, () => rnd());
  return gerar(64, 128, (x, y) => {
    let v = 80 + ruido(x, y % 64) * 60 + ruido2(x, y % 64) * 25 + grao[y * 64 + x] * 12;
    const viga = x < 6 || x >= 58;
    if (viga) {
      v = 62 + grao[y * 64 + x] * 16;
      if (x === 0 || x === 63) v *= 0.4;
      if (x === 5 || x === 58) v *= 0.55;
      if (x === 1 || x === 59) v *= 1.5;
      if (y % 16 === 8 && (x === 3 || x === 61)) v *= 1.9;            // parafuso
      return rgb(v, v * 0.95, v * 0.9);
    }
    if (y % 64 === 0) v *= 0.4;
    if (y % 64 === 1) v *= 1.25;
    // caveira simples (olhos e boca) estampada na chapa de cima
    const cx = x - 32, cy = y - 34;
    if (cx * cx + cy * cy * 1.2 < 150) {
      v *= 0.8;
      if ((Math.abs(cx) > 2 && Math.abs(cx) < 7 && cy > -5 && cy < 0) || (Math.abs(cx) < 5 && cy > 4 && cy < 8 && (x & 1))) v *= 0.3;
    }
    return rgb(v * 1.05, v * 0.66, v * 0.4);
  });
}

// --------------------------------------------------------------------- pisos

/** Piso tecnológico: placas de 32 px com juntas e manchas. */
function pisoTech() {
  const rnd = aleatorio(41), ruido = criarRuido(42, 8, 64);
  const grao = Array.from({ length: 64 * 64 }, () => rnd());
  return gerar(64, 64, (x, y) => {
    let v = 58 + ruido(x, y) * 36 + grao[y * 64 + x] * 12;
    const px = x % 32, py = y % 32;
    if (px === 0 || py === 0) v *= 0.4;
    else if (px === 1 || py === 1) v *= 1.2;
    if (((x >> 5) + (y >> 5)) & 1) v *= 0.86;
    if ((px === 5 || px === 27) && (py === 5 || py === 27)) v *= 0.5;
    return rgb(v * 0.9, v * 0.92, v);
  });
}

/** Piso infernal: rocha rachada com veios de lava. */
function pisoInferno() {
  const rnd = aleatorio(51), ruido = criarRuido(52, 6, 64), veio = criarRuido(53, 5, 64);
  const grao = Array.from({ length: 64 * 64 }, () => rnd());
  return gerar(64, 64, (x, y) => {
    const v = 48 + ruido(x, y) * 60 + grao[y * 64 + x] * 16;
    const k = Math.abs(veio(x, y) - 0.5);
    if (k < 0.022) return rgb(255, 150 + grao[y * 64 + x] * 70, 30);
    if (k < 0.05) return rgb(170, 45, 12);
    return rgb(v * 1.1, v * 0.42, v * 0.34);
  });
}

/** Piso da faixa central: metal com listras de alerta nas bordas. */
function pisoAlerta() {
  const base = pisoTech();
  return gerar(64, 64, (x, y) => {
    if (y < 6 || y >= 58) return ((x + y) >> 3) & 1 ? rgb(170, 130, 20) : rgb(30, 28, 26);
    return base.px[y * 64 + x];
  });
}

export function criarTexturas() {
  return {
    // índice = valor da célula no mapa (0 = vazio)
    paredes: [null, paredeBase(), paredePilar(), paredeFerro()],
    pisos: [pisoTech(), pisoInferno(), pisoAlerta()],
  };
}
