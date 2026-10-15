// Inimigos. Cada entrada junta os NÚMEROS (vida, velocidade, dano...) e os SPRITES.
// O comportamento em si fica em entities/Inimigo.js, escolhido pelo campo `ia`.
//
//   raio       raio de colisão em unidades do mapa (1 unidade = 1 célula)
//   escala     tamanho do sprite (1 = 64 px por unidade, a proporção original do Doom)
//   voa        z do CENTRO do sprite; se ausente, o sprite fica com a base no chão
//   xp         valor da gema de XP que solta
//   chanceDor  chance de "sentir" o tiro e interromper o que estava fazendo
//   sons       { ver, dor, morte, ataque }: nomes de data/sons.js. Sem `dor`/`morte`,
//              usa os genéricos; `ver` toca quando o monstro nasce
//
// No Heavy Doom Metal os inimigos são cabeças do Eddie (atlas "eddies", gerado por
// tools/gerar-heavy.ps1 a partir de Assets/heavy/inimigos). Só a Banshee ainda é do Doom.
// Os nomes internos (blob, lostsoul, ghoul, vassago, spider) continuam os do jogo original
// porque data/ondas.js e o chefão usam esses nomes; o que aparece na tela é o campo `nome`.

const s = (atlas, ...chaves) => chaves.map(c => `${atlas}_${c}`);

/** Os sprites de uma cabeça do Eddie: as poses geradas pelo tratamento de pixel art. */
function eddie(qual, fpsMorrer = 9) {
  const p = `eddies_${qual}`;
  return {
    andar: [`${p}_andar0`, `${p}_andar1`], fps: 3,
    atacar: [`${p}_atacar0`, `${p}_atacar1`],
    dor: [`${p}_dor`],
    morrer: [0, 1, 2, 3, 4, 5].map(i => `${p}_morrer${i}`), fpsMorrer,
  };
}

export const INIMIGOS = {
  // Enxame básico (era o Blob): fraco, vem em bando e morde.
  blob: {
    nome: 'Eddie Book', ia: 'perseguidor', vida: 24, vel: 2.8, raio: 0.3, escala: 1, voa: 0.6, xp: 1,
    ataque: { dano: 7, alcance: 0.45, intervalo: 0.9 },
    chanceDor: 0,
    sprites: eddie('book'),
    sons: { morte: 'gosma' },
    corRadar: 0xff3030d0,
  },
  // Para, grita e se lança em linha reta (era o Lost Soul). Dá para desviar de lado.
  lostsoul: {
    nome: 'Eddie', ia: 'investida', vida: 34, vel: 2.9, raio: 0.32, escala: 1, voa: 0.65, xp: 2,
    investida: { dano: 14, vel: 12.5, alcance: 7.5, preparo: 0.5, duracao: 1.0, intervalo: 2.4 },
    chanceDor: 0.5,
    sprites: eddie('classico'),
    sons: { ataque: 'lostSoulAtaque', morte: 'lostSoulMorte' },
    corRadar: 0xff30a0ff,
  },
  // Kamikaze: mais rápida que você. Mate de longe, porque ela explode.
  banshee: {
    nome: 'Banshee', ia: 'kamikaze', vida: 40, vel: 5.0, raio: 0.32, escala: 1.15, voa: 0.6, xp: 3,
    explosao: { dano: 24, raio: 1.9, pavio: 0.38, gatilho: 1.15, danoInimigos: 45 },
    chanceDor: 0,
    sprites: { andar: s('banshee', '0_0', '0_1', '0_2', '0_3'), fps: 8, morrer: s('banshee', '1_0', '1_1', '1_2', '1_3'), brilho: true, morrerBrilho: true },
    sons: { ataque: 'bansheeGrito', dor: 'bansheeDor', morte: 'bansheeMorte' },
    corRadar: 0xff00d0ff,
  },
  // Mantém distância, anda de lado e atira raios (era o Ghoul).
  ghoul: {
    nome: 'Eddie Powerslave', ia: 'atirador', vida: 55, vel: 2.6, raio: 0.36, escala: 1, voa: 0.75, xp: 4,
    tiro: { dano: 8, vel: 6.5, intervalo: 3.0, distMin: 4.5, distMax: 9, preparo: 0.45, projetil: 'raio' },
    chanceDor: 0.4,
    sprites: eddie('powerslave'),
    sons: { ver: 'ghoulVer', dor: 'ghoulDor', morte: 'ghoulMorte' },
    corRadar: 0xffffd060,
  },
  // Tanque (era o Vassago): lento, aguenta muito, lança 3 bolas de fogo que deixam o chão queimando.
  vassago: {
    nome: 'Eddie V2', ia: 'tanque', vida: 520, vel: 1.75, raio: 0.55, escala: 1, voa: 1.05, xp: 25, xpGrande: true,
    ataque: { dano: 26, alcance: 0.7, intervalo: 1.2 },
    tiro: { dano: 14, vel: 7, intervalo: 3.4, distMin: 0, distMax: 11, preparo: 0.55, projetil: 'fogo', quantidade: 3, leque: 0.3 },
    chanceDor: 0.12, empurraoMult: 0.25,
    sprites: eddie('v2'),
    sons: { ver: 'vassagoVer', ataque: 'vassagoAtaque', dor: 'vassagoDor', morte: 'vassagoMorte' },
    corRadar: 0xff4060ff, radarGrande: true,
  },
  // Chefão (era o Spider Mastermind). Os padrões de ataque estão em entities/Chefe.js;
  // os números, em data/chefe.js.
  spider: {
    nome: 'Eddie 80', ia: 'chefe', vida: 24000, vel: 1.9, raio: 1.15, escala: 1, voa: 1.55, xp: 0,
    chanceDor: 0, empurraoMult: 0, chefe: true,
    sprites: eddie('80', 4),
    sons: { morte: 'chefeMorte' },
    corRadar: 0xffff40ff, radarGrande: true,
  },
};

// Projéteis dos inimigos (atlas "fx").
export const PROJETEIS_INIMIGOS = {
  raio: { quadros: s('fx', '1_0', '1_1'), fps: 10, raio: 0.22, escala: 1.3, impacto: s('fx', '1_2', '1_3', '1_4', '1_5') },
  fogo: {
    quadros: s('fx', '29_0', '29_1', '29_2', '29_3'), fps: 10, raio: 0.28, escala: 1.3, impacto: s('fx', '6_10', '6_11', '6_12'),
    // deixa uma chama no chão que queima quem pisar
    chama: { quadros: s('fx', '30_3', '30_4', '30_5', '30_6', '30_7', '30_8', '30_9', '30_10', '30_11', '30_12', '30_13', '30_14'), duracao: 3.2, raio: 0.85, dano: 7, intervalo: 0.45 },
  },
  bala: { quadros: s('fx', '2_0', '2_1'), fps: 12, raio: 0.2, escala: 1.0, impacto: s('fx', '2_2', '2_3', '2_4'), impactoEscala: 0.6 },
  orbe: { quadros: s('fx', '3_0', '3_1'), fps: 8, raio: 0.3, escala: 1.5, impacto: s('fx', '3_2', '3_3', '3_4') },
  orbeVerde: { quadros: s('fx', '4_0', '4_1'), fps: 8, raio: 0.3, escala: 1.5, impacto: s('fx', '4_2', '4_3', '4_4') },
};

// Efeitos avulsos.
export const EFEITOS = {
  sangue: s('fx', '11_0', '11_1', '11_2'),
  fumaca: s('fx', '23_0', '23_1', '23_2'),
  teleporte: s('fx', '24_0', '24_1', '24_2', '24_3', '24_4', '24_5', '24_6', '24_7'),
  explosao: s('fx', '21_0', '21_1', '21_2'),
  nevoaAzul: s('fx', '17_0', '17_1', '17_2', '17_3'),
};
