// Texturas procedurais de parede e chão (no Heavy Doom Metal: a catedral, no fim do arquivo).
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

// ------------------------------------------------- cenário da catedral (Heavy Doom Metal)
// O Heavy Doom Metal se passa numa catedral gótica tomada pelo metal: paredes de
// pedra com vitrais, colunas, tubos de órgão, mármore xadrez e um tapete vermelho.
// As texturas da base tecnológica acima continuam no arquivo, mas não são usadas.

/** Parede externa: blocos de pedra fria com um vitral gótico (arco pontudo) no meio. */
function paredeCatedral() {
  const rnd = aleatorio(61), ruido = criarRuido(62, 8, 64);
  const grao = Array.from({ length: 64 * 128 }, () => rnd());
  // cores do vitral: cada "caco" de vidro pega uma delas
  const vidros = [[190, 30, 40], [40, 60, 190], [140, 40, 170], [220, 170, 40], [40, 140, 90]];
  return gerar(64, 128, (x, y) => {
    const fileira = y >> 4;
    const bx = (x + (fileira & 1) * 16) % 32, by = y % 16;
    let v = 72 + ruido(x, y % 64) * 40 + grao[y * 64 + x] * 12;
    v *= 0.9 + ((fileira * 29 + ((x + (fileira & 1) * 16) >> 5) * 53) % 5) * 0.04; // tom por bloco
    if (bx === 0 || by === 0) v *= 0.4;
    else if (bx === 1 || by === 1) v *= 1.15;
    // vitral: retângulo de x 18..45 e y 30..100, com o topo em arco pontudo (dois arcos de círculo)
    const cx = x - 31.5, dentroArco = y >= 30 && y < 100 && Math.abs(cx) < 14
      && (y >= 48 || (Math.hypot(Math.abs(cx) + 8, y - 48) < 22));
    if (dentroArco) {
      // moldura de chumbo e caixilhos
      if (Math.abs(cx) > 12.5 || y >= 98 || Math.abs(cx) < 0.8 || (y % 14 === 0)) return rgb(18, 16, 22);
      // cacos irregulares: cada célula 6x7 ganha uma cor, com veios de chumbo entre elas
      const celula = ((Math.floor((x + (y >> 3)) / 6) * 7 + Math.floor(y / 7) * 3) % vidros.length + vidros.length) % vidros.length;
      if ((x + (y >> 3)) % 6 === 0 || y % 7 === 0) return rgb(25, 20, 30);
      const c = vidros[celula], brilho = 0.75 + grao[y * 64 + x] * 0.35;
      return rgb(c[0] * brilho, c[1] * brilho, c[2] * brilho);
    }
    // contorno de pedra lavrada em volta do vitral
    if (y >= 26 && y < 104 && Math.abs(cx) < 17 && (y >= 44 || Math.hypot(Math.abs(cx) + 8, y - 48) < 26)) v *= 1.25;
    return rgb(v * 0.82, v * 0.8, v * 0.92);
  });
}

/** Coluna gótica: pedra clara com caneluras (frisos verticais), capitel e base. */
function colunaGotica() {
  const rnd = aleatorio(71), ruido = criarRuido(72, 6, 64);
  const grao = Array.from({ length: 64 * 128 }, () => rnd());
  return gerar(64, 128, (x, y) => {
    let v = 105 + ruido(x, y % 64) * 30 + grao[y * 64 + x] * 10;
    // caneluras: sombra e luz alternadas a cada 8 px, como um cilindro frisado
    const f = x % 8;
    v *= f === 0 ? 0.55 : f === 1 ? 0.75 : f === 6 ? 1.15 : 1;
    v *= 0.8 + Math.sin((x / 64) * Math.PI) * 0.3;          // mais claro no meio, como um volume redondo
    if (y < 14) { v = 80 + grao[y * 64 + x] * 20; if (y % 5 === 0) v *= 0.5; }      // capitel com molduras
    if (y >= 116) { v = 70 + grao[y * 64 + x] * 15; if (y === 116 || y === 122) v *= 0.5; } // base
    return rgb(v * 0.95, v * 0.9, v * 0.85);
  });
}

/** Muro interno: tubos de órgão de metal sobre madeira escura. */
function paredeOrgao() {
  const rnd = aleatorio(81);
  const grao = Array.from({ length: 64 * 128 }, () => rnd());
  // 8 tubos de 8 px; a altura de cada um forma a "escadinha" típica do órgão
  const topos = [30, 22, 14, 8, 8, 14, 22, 30];
  return gerar(64, 128, (x, y) => {
    const tubo = x >> 3, px = x % 8, topo = topos[tubo];
    if (y >= topo && y < 112 && px > 0 && px < 7) {
      // cilindro metálico: brilho forte numa faixa, escurecendo nas bordas
      const luz = [0, 0.55, 0.85, 1.25, 1, 0.75, 0.5, 0][px];
      let v = 150 * luz + grao[y * 64 + x] * 15;
      const boca = y >= topo + 50 && y < topo + 58 && px > 1 && px < 6;   // a "boca" do tubo
      if (boca) v *= 0.25;
      if (y === topo || y === topo + 1) v *= 1.3;                         // aro no topo
      const dourado = tubo % 2 === 0;
      return dourado ? rgb(v * 1.05, v * 0.85, v * 0.45) : rgb(v * 0.9, v * 0.9, v * 0.95);
    }
    // madeira escura com veios
    let v = 40 + grao[y * 64 + x] * 12 + Math.sin(y * 0.35 + x * 0.05) * 6;
    if (y >= 112) { v *= 1.3; if (y === 112 || y === 126) v *= 0.5; }    // rodapé de madeira
    return rgb(v * 1.2, v * 0.75, v * 0.5);
  });
}

/** Piso: mármore em xadrez, casas pretas e vinho, com veios claros. */
function pisoMarmore() {
  const rnd = aleatorio(91), veio = criarRuido(92, 5, 64);
  const grao = Array.from({ length: 64 * 64 }, () => rnd());
  return gerar(64, 64, (x, y) => {
    const escura = ((x >> 5) + (y >> 5)) & 1;
    let v = (escura ? 34 : 70) + grao[y * 64 + x] * 8;
    if (Math.abs(veio(x, y) - 0.5) < 0.02) v += 40;                      // veio do mármore
    if (x % 32 === 0 || y % 32 === 0) v *= 0.6;                           // junta
    return escura ? rgb(v * 0.9, v * 0.85, v * 0.95) : rgb(v * 1.25, v * 0.45, v * 0.45);
  });
}

/** Piso: lajes de pedra gasta (perto das paredes, longe do centro). */
function pisoLaje() {
  const rnd = aleatorio(101), ruido = criarRuido(102, 8, 64);
  const grao = Array.from({ length: 64 * 64 }, () => rnd());
  return gerar(64, 64, (x, y) => {
    let v = 45 + ruido(x, y) * 35 + grao[y * 64 + x] * 12;
    const lx = (x + ((y >> 4) & 1) * 16) % 32, ly = y % 16;
    if (lx === 0 || ly === 0) v *= 0.45;
    return rgb(v * 0.85, v * 0.82, v * 0.9);
  });
}

/** Piso: tapete vermelho com barra dourada (o corredor central da nave). */
function pisoTapete() {
  const rnd = aleatorio(111);
  const grao = Array.from({ length: 64 * 64 }, () => rnd());
  return gerar(64, 64, (x, y) => {
    const v = 0.85 + grao[y * 64 + x] * 0.2;
    if (x < 4 || x >= 60) return rgb(200 * v, 150 * v, 40 * v);             // barra dourada
    if (x < 6 || x >= 58) return rgb(60 * v, 10 * v, 10 * v);
    const motivo = ((x + y) % 16 === 0 || (x - y + 64) % 16 === 0) ? 0.7 : 1; // losangos discretos
    return rgb(150 * v * motivo, 18 * v * motivo, 24 * v * motivo);
  });
}

export function criarTexturas() {
  return {
    // índice = valor da célula no mapa (0 = vazio)
    paredes: [null, paredeCatedral(), colunaGotica(), paredeOrgao()],
    pisos: [pisoMarmore(), pisoLaje(), pisoTapete()],
  };
}
