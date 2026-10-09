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
// Só são usados os frames FRONTAIS de cada monstro: em primeira pessoa, quem está
// te perseguindo está sempre de frente para você.

const s = (atlas, ...chaves) => chaves.map(c => `${atlas}_${c}`);

export const INIMIGOS = {
  // Enxame básico: fraco, vem em bando e morde.
  blob: {
    nome: 'Blob', ia: 'perseguidor', vida: 24, vel: 2.8, raio: 0.3, escala: 1.25, xp: 1,
    ataque: { dano: 7, alcance: 0.45, intervalo: 0.9 },
    chanceDor: 0,
    sprites: { andar: s('blob', '1_0', '1_1', '1_2', '1_1'), fps: 6, morrer: s('fx', '2_2', '2_3', '2_4'), morrerBrilho: true },
    sons: { morte: 'gosma' },
    corRadar: 0xff3030d0,
  },
  // Para, grita e se lança em linha reta. Dá para desviar de lado.
  lostsoul: {
    nome: 'Lost Soul', ia: 'investida', vida: 34, vel: 2.9, raio: 0.3, escala: 1, voa: 0.62, xp: 2,
    investida: { dano: 14, vel: 12.5, alcance: 7.5, preparo: 0.5, duracao: 1.0, intervalo: 2.4 },
    chanceDor: 0.5,
    sprites: {
      andar: s('lostsoul', '0_0', '2_0'), fps: 6, atacar: s('lostsoul', '3_0', '4_0'), dor: s('lostsoul', '5_0'),
      morrer: s('lostsoul', '6_0', '6_1', '6_2', '6_3', '6_4', '6_5'), brilho: true, morrerBrilho: true,
    },
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
  // Mantém distância, anda de lado e atira raios.
  ghoul: {
    nome: 'Ghoul', ia: 'atirador', vida: 55, vel: 2.6, raio: 0.34, escala: 1.5, voa: 0.75, xp: 4,
    tiro: { dano: 8, vel: 6.5, intervalo: 3.0, distMin: 4.5, distMax: 9, preparo: 0.45, projetil: 'raio' },
    chanceDor: 0.4,
    sprites: {
      andar: s('ghoul', '0_0', '0_1', '0_2', '0_1'), fps: 6, atacar: s('ghoul', '0_3', '0_4', '0_5', '0_6'), dor: s('ghoul', '0_8'),
      morrer: s('ghoul', '5_0', '5_1', '5_2', '5_3', '5_4', '5_5', '5_6', '5_7'), cadaver: 'ghoul_5_7',
    },
    sons: { ver: 'ghoulVer', dor: 'ghoulDor', morte: 'ghoulMorte' },
    corRadar: 0xffffd060,
  },
  // Tanque: lento, aguenta muito, lança 3 bolas de fogo que deixam o chão queimando.
  vassago: {
    nome: 'Vassago', ia: 'tanque', vida: 520, vel: 1.75, raio: 0.5, escala: 1.25, xp: 25, xpGrande: true,
    ataque: { dano: 26, alcance: 0.7, intervalo: 1.2 },
    tiro: { dano: 14, vel: 7, intervalo: 3.4, distMin: 0, distMax: 11, preparo: 0.55, projetil: 'fogo', quantidade: 3, leque: 0.3 },
    chanceDor: 0.12, empurraoMult: 0.25,
    sprites: {
      andar: s('vassago', '0_0', '1_0', '2_0', '3_0'), fps: 5, atacar: s('vassago', '4_0', '5_0', '6_0', '7_0'), dor: s('vassago', '8_0'),
      morrer: Array.from({ length: 8 }, (_, i) => `vassago_morte_${i}`), cadaver: 'vassago_morte_7', morrerBrilho: true,
    },
    sons: { ver: 'vassagoVer', ataque: 'vassagoAtaque', dor: 'vassagoDor', morte: 'vassagoMorte' },
    corRadar: 0xff4060ff, radarGrande: true,
  },
  // Chefão. Os padrões de ataque estão em entities/Chefe.js; os números, em data/chefe.js.
  spider: {
    nome: 'Spider Mastermind', ia: 'chefe', vida: 24000, vel: 1.9, raio: 1.15, escala: 1.5, xp: 0,
    chanceDor: 0, empurraoMult: 0, chefe: true,
    sprites: {
      andar: s('spider', '0_0', '1_0', '2_0', '1_0'), fps: 5, atacar: s('spider', '0_0'),
      morrer: s('spider', '3_0', '3_1', '3_2', '3_3', '3_4', '4_0', '4_1', '4_2', '4_3', '4_4', '4_5'), fpsMorrer: 4, cadaver: 'spider_4_5',
    },
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
