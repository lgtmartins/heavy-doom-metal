// Tabela de sons: nome usado no código -> arquivo WAV original do Doom (ou MP3 do Heavy).
//
//   arquivo    nome do WAV na pasta de efeitos (sem ".wav"). Uma lista = variações sorteadas.
//              Um nome terminado em ".mp3" vem de Assets/heavy/sons (os sons próprios do Heavy).
//   volume     0..1 (padrão 1)
//   tom        velocidade de reprodução: < 1 deixa mais grave (padrão 1)
//   variacao   sorteia o tom em ±esse valor a cada toque, para tiros repetidos não soarem idênticos
//
// `npm run sons` copia os arquivos citados aqui para public/assets/sfx/.
// Um nome que não esteja nesta tabela cai no som sintetizado de systems/Sons.js
// (é o caso de 'xp', 'dash' e 'vitoria', que não têm equivalente no pack).

export const PASTA_ORIGEM = 'MS-DOS - DOOM _ DOOM II - Miscellaneous - Sound Effects (DOOM _ DOOM II _ Legacy of Rust)/SFX';
export const PASTA_HEAVY = 'Assets/heavy/sons';

export const SONS = {
  // ---- armas
  pistola: { arquivo: 'pistol', volume: 0.8, variacao: 0.03 },
  shotgun: { arquivo: 'shotgun' },
  chaingun: { arquivo: 'pistol', volume: 0.7, variacao: 0.05 },   // no Doom a chaingun usa o som da pistola
  foguete: { arquivo: 'rocket launch', volume: 0.9 },
  explosao: { arquivo: 'barrel explode' },
  plasma: { arquivo: 'plasma', volume: 0.55, variacao: 0.03 },
  bfg: { arquivo: 'BFG-9000' },
  bfgExplosao: { arquivo: 'BFG explode' },
  trocar: { arquivo: 'weapon up', volume: 0.7 },
  negado: { arquivo: 'player umf', volume: 0.8 },

  // ---- jogador e itens
  ferido: { arquivo: 'player pain' },
  morte: { arquivo: 'player death' },
  item: { arquivo: 'item up' },
  poder: { arquivo: 'get powerup' },
  // subir de nível (abre as cartas): um dos dois riffs de guitarra, sorteado
  nivel: { arquivo: ['eric-andre-guitar-riff.mp3', 'rokytshred.mp3'], volume: 0.9 },

  // ---- inimigos
  teleporte: { arquivo: 'teleport', volume: 0.6 },
  dorGenerica: { arquivo: 'generic demon pain', volume: 0.7 },
  gosma: { arquivo: 'gib', volume: 0.6, variacao: 0.12 },          // morte do Blob
  tiroInimigo: { arquivo: 'projectile', volume: 0.7 },
  impacto: { arquivo: 'projectile contact', volume: 0.6 },
  fogo: { arquivo: 'incinerator flame hit 1', volume: 0.6 },
  lostSoulAtaque: { arquivo: 'lost soul attack', volume: 0.8 },
  lostSoulMorte: { arquivo: 'projectile contact', volume: 0.7 },
  bansheeGrito: { arquivo: 'banshee activity' },
  bansheeDor: { arquivo: 'banshee pain', volume: 0.7 },
  bansheeMorte: { arquivo: 'banshee death', volume: 0.8 },
  ghoulVer: { arquivo: 'ghoul sight', volume: 0.7 },
  ghoulDor: { arquivo: 'ghoul pain', volume: 0.7 },
  ghoulMorte: { arquivo: ['ghoul death', 'ghoul death 2'], volume: 0.8 },
  vassagoVer: { arquivo: 'vassago sight' },
  vassagoAtaque: { arquivo: 'vassago attack', volume: 0.9 },
  vassagoDor: { arquivo: 'vassago pain', volume: 0.8 },
  vassagoMorte: { arquivo: 'vassago death' },

  // ---- chefão
  chefeRugido: { arquivo: 'spiderdemon sight' },
  chefeFuria: { arquivo: 'cyberdemon sight' },
  chefeMorte: { arquivo: 'spiderdemon death' },
  chefePasso: { arquivo: 'metal walk', volume: 0.7 },
  chefeTiro: { arquivo: 'shotgun', volume: 0.45, tom: 1.25, variacao: 0.04 }, // a metralhadora dele usa o som da shotgun

  // ---- interface
  menu: { arquivo: 'platform stop', volume: 0.5 },   // mover o cursor, como no menu do Doom
  confirmar: { arquivo: 'pistol', volume: 0.8 },     // escolher uma opção
  onda: { arquivo: 'klaxon', volume: 0.8 },
};

/** Transforma o nome do WAV num nome de arquivo simples para a web: "BFG explode" -> "bfg-explode". */
export const slug = (nome) => nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Nome do arquivo publicado em public/assets/sfx: "BFG explode" -> "bfg-explode.wav"; MP3 continua MP3. */
export const arquivoWeb = (nome) => nome.endsWith('.mp3') ? `${slug(nome.slice(0, -4))}.mp3` : `${slug(nome)}.wav`;

/** Lista, sem repetição, de todos os arquivos citados na tabela. */
export const arquivosDeSom = () => [...new Set(Object.values(SONS).flatMap(s => [].concat(s.arquivo)))];
