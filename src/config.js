// Constantes globais do jogo. Tudo que é "número de balanceamento" mora em src/data/.

// A vista 3D é renderizada em 320x168 (a mesma área de jogo do Doom original:
// 200 linhas menos 32 da barra de status) e ampliada 3x pelo Phaser.
export const ESCALA = 3;
export const VISTA_L = 320;
export const VISTA_A = 168;
export const HUD_A = 32;
export const TELA_L = VISTA_L * ESCALA;            // 960
export const TELA_A = (VISTA_A + HUD_A) * ESCALA;  // 600

// Mundo: 1 unidade = 1 célula do mapa = 64 px de textura/sprite.
export const PX_POR_UNIDADE = 64;
export const ALTURA_PAREDE = 2;     // paredes de 128 px, como no Doom
export const ALTURA_OLHO = 0.64;    // 41 px, a altura da câmera do Doom
export const FOV = Math.PI / 2;     // 90 graus

export const ATLAS = ['lostsoul', 'banshee', 'ghoul', 'vassago', 'spider', 'blob',
  'weapons', 'pickups', 'fx', 'hud', 'menu', 'skies',
  'rosto', 'guitarra']; // arte própria do Heavy Doom Metal (gerada por tools/gerar-heavy.ps1)

export const FONTE = 'Impact, "Arial Black", "Arial Narrow Bold", sans-serif';
export const COR = { vermelho: '#d01010', amarelo: '#ffd23a', cinza: '#b8b8b8', branco: '#ffffff', escuro: '#1a0505' };

// ?debug na URL liga os atalhos de teste e expõe window.__doom
export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
