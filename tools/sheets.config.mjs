// Configuração do recorte: uma entrada por sheet de Assets/.
// Os campos estão explicados no cabeçalho de recortar.mjs.
const P = 'MS-DOS - DOOM _ DOOM II - ';
const CIANO = [0, 255, 255];
const AZUL_VAULT = [0, 170, 255];      // fundo das sheets "id Vault"
const PAGINA_DOLPHMAN = [[149, 177, 200], [84, 109, 142]]; // fundo + moldura das sheets do Dolphman

export default [
  {
    nome: 'lostsoul', arquivo: `${P}Enemies - Lost Soul.png`, modo: 'celulas',
    fundoPagina: PAGINA_DOLPHMAN, fundoCelula: [CIANO],
  },
  {
    nome: 'banshee', arquivo: `${P}Enemies (Legacy of Rust) - Banshee.png`, modo: 'celulas',
    fundoPagina: [[27, 89, 153]], fundoCelula: [[167, 107, 107]], aparar: false,
  },
  {
    nome: 'ghoul', arquivo: `${P}Enemies (Legacy of Rust) - Ghoul.png`, modo: 'celulas',
    fundoPagina: [[0, 128, 128]], fundoCelula: [CIANO], aparar: false,
  },
  {
    nome: 'vassago', arquivo: `${P}Enemies (Legacy of Rust) - Vassago.png`, modo: 'blobs',
    fundo: ['transp'], gap: 0, escalaDebug: 1,
    ignorar: [
      { x: 700, y: 100, w: 404, h: 140 },  // "ripped by planz doom"
      { x: 585, y: 0, w: 90, h: 180 },      // 8º ângulo das 2 primeiras linhas: os sprites se encostam (e não são usados)
    ],
    // a morte é feita de pedacinhos soltos (chamas, crânio): recorte manual, um retângulo por frame
    regioes: [[0, 76], [76, 75], [151, 76], [227, 74], [301, 73], [374, 76], [450, 80], [530, 70]]
      .map(([x, w], i) => ({ nome: `vassago_morte_${i}`, x, y: 829, w, h: 85 })),
  },
  {
    nome: 'spider', arquivo: `${P}id Vault Assets - Spider Mastermind (Unused).png`, modo: 'blobs',
    fundo: [AZUL_VAULT], gap: 0, escalaDebug: 1,
    ignorar: [{ x: 0, y: 599, w: 1209, h: 31 }], // texto de créditos
  },
  {
    nome: 'blob', arquivo: `${P}id Vault Assets - _The Blob_ (Unused).png`, modo: 'blobs',
    fundo: [AZUL_VAULT], gap: 0, escalaDebug: 3,
    ignorar: [{ x: 131, y: 0, w: 209, h: 60 }], // texto de créditos
  },
  {
    nome: 'weapons', arquivo: `${P}Miscellaneous - Weapons.png`, modo: 'celulas',
    fundoPagina: PAGINA_DOLPHMAN, fundoCelula: [CIANO], tolerancia: 0,
  },
  {
    nome: 'pickups', arquivo: `${P}Miscellaneous - Pickups.png`, modo: 'blobs',
    fundo: [CIANO, [0, 128, 128]], gap: 0, minArea: 45, // minArea descarta as letras dos títulos
  },
  {
    nome: 'fx', arquivo: `${P}Miscellaneous - Projectiles and Effects.png`, modo: 'celulas',
    fundoPagina: [[218, 117, 255]], fundoCelula: [[255, 0, 127], [255, 0, 110]],
  },
  {
    nome: 'faces', arquivo: `${P}Miscellaneous - Doom Guy _ Unnamed Marine Face HUD.png`, modo: 'blobs',
    fundo: [...PAGINA_DOLPHMAN, CIANO], gap: 0,
  },
  {
    // A sheet do HUD é toda emoldurada, então a detecção automática não serve:
    // aqui o recorte é manual (modo 'regioes'). As posições dos dígitos foram
    // medidas pela projeção de colunas (o "1" é mais estreito que os outros).
    nome: 'hud', arquivo: `${P}Miscellaneous - HUD.png`, modo: 'regioes', aparar: false,
    fundo: [CIANO, [0, 127, 127], [0, 64, 64]],
    regioes: [
      { nome: 'hud_barra', x: 10, y: 23, w: 320, h: 32, cheio: true },   // status bar original (referência)
      { nome: 'hud_pedra', x: 12, y: 246, w: 120, h: 28, cheio: true },  // trecho liso de pedra, usado como textura do HUD
      { nome: 'hud_menos', x: 10, y: 79, w: 8, h: 16 },
      ...[19, 34, 46, 61, 76, 91, 106, 121, 136, 151].map((x, i) => ({ nome: `hud_num_${i}`, x, y: 79, w: i === 1 ? 11 : 14, h: 16 })),
      { nome: 'hud_pct', x: 166, y: 79, w: 14, h: 16 },
    ],
  },
  {
    nome: 'menu', arquivo: `${P}Miscellaneous - Menu.png`, modo: 'celulas',
    fundoPagina: PAGINA_DOLPHMAN, fundoCelula: [CIANO, [1, 255, 255]],
  },
  {
    nome: 'skies', arquivo: `${P}Miscellaneous - Skies.png`, modo: 'blobs',
    fundo: [CIANO], gap: 0, minArea: 5000, escalaDebug: 1, // minArea descarta o texto "PROTOTYPES"
    soNomeados: true, nomes: { '0_2': 'sky_inferno', '5_2': 'sky_nuvens' }, // só os céus usados entram no atlas
  },
];
