// Ponto de entrada: configura o Phaser e registra as cenas.
import Phaser from 'phaser';
import { TELA_L, TELA_A, DEBUG } from './config.js';
import { CenaBoot } from './scenes/CenaBoot.js';
import { CenaMenu } from './scenes/CenaMenu.js';
import { CenaJogo } from './scenes/CenaJogo.js';
import { CenaHud } from './scenes/CenaHud.js';
import { CenaCartas } from './scenes/CenaCartas.js';
import { CenaPausa } from './scenes/CenaPausa.js';
import { CenaFim } from './scenes/CenaFim.js';
import { CenaMusica } from './scenes/CenaMusica.js';

// Não há bloco `physics` de propósito. O mundo do jogo é desenhado por um
// raycaster (render/Raycaster.js) e as entidades são objetos simples num mapa em
// grade, então a colisão é feita à mão em data/mapa.js e systems/Horda.js. O
// Arcade Physics só enxerga GameObjects 2D do Phaser, que aqui não existem.
const jogo = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  width: TELA_L,
  height: TELA_A,
  backgroundColor: '#000000',
  pixelArt: true,                    // sem suavização: pixels nítidos ao ampliar
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },          // o som é todo nosso (systems/Sons.js)
  scene: [CenaBoot, CenaMenu, CenaJogo, CenaHud, CenaCartas, CenaPausa, CenaMusica, CenaFim],
});

if (DEBUG) window.__phaser = jogo; // usado pelo teste automatizado (tools/teste.mjs)

export default jogo;
