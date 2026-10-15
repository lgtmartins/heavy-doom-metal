// Carregamento: baixa os atlas, copia os pixels para o banco do raycaster, gera
// as texturas procedurais e confere se todo sprite citado em data/ existe.
import Phaser from 'phaser';
import { ATLAS, TELA_L, TELA_A, COR } from '../config.js';
import { carregarAtlasNoBanco, temQuadro } from '../render/BancoDeSprites.js';
import { criarTexturas } from '../render/texturas.js';
import { ARMAS } from '../data/armas.js';
import { INIMIGOS, PROJETEIS_INIMIGOS, EFEITOS } from '../data/inimigos.js';
import { ITENS } from '../data/itens.js';
import { UPGRADES, CARTA_RESERVA } from '../data/upgrades.js';
import { ROSTO } from '../data/rosto.js';
import { arquivosDeSom, slug } from '../data/sons.js';
import { sons } from '../systems/Sons.js';
import { texto } from './ui.js';

export class CenaBoot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const barra = this.add.rectangle(TELA_L / 2 - 200, TELA_A / 2, 0, 18, 0xd01010).setOrigin(0, 0.5);
    this.add.rectangle(TELA_L / 2, TELA_A / 2, 404, 22).setStrokeStyle(2, 0x777777);
    texto(this, TELA_L / 2, TELA_A / 2 - 40, 'CARREGANDO...', 26, COR.cinza);
    this.load.on('progress', (p) => { barra.width = 400 * p; });
    for (const nome of ATLAS) this.load.atlas(nome, `assets/${nome}.png`, `assets/${nome}.json`);
    this.load.image('logo', 'assets/logo.png');
    this.load.image('fundoMenu', 'assets/fundo-menu.jpg');
    // Os sons são baixados como binário puro: quem os decodifica e toca é systems/Sons.js
    // (o áudio do Phaser está desligado em main.js).
    for (const nome of arquivosDeSom()) this.load.binary(`sfx-${slug(nome)}`, `assets/sfx/${slug(nome)}.wav`);
  }

  create() {
    for (const nome of ATLAS) carregarAtlasNoBanco(this, nome);
    // `registry` é o "quadro de avisos" global do Phaser: qualquer cena lê daqui
    this.registry.set('texturas', criarTexturas());
    sons.registrar(Object.fromEntries(arquivosDeSom().map(nome => [nome, this.cache.binary.get(`sfx-${slug(nome)}`)]).filter(([, dados]) => dados)));
    this.validarSprites();
    this.scene.start('Menu');
  }

  /**
   * Varre data/ atrás de nomes de frame e avisa no console os que não existem.
   * Um erro de digitação num nome de sprite aparece aqui, na hora, e não no
   * meio da onda 7 quando o inimigo finalmente tenta usar o frame.
   */
  validarSprites() {
    const faltando = new Set();
    const eNomeDeFrame = (s) => /^(lostsoul|banshee|ghoul|vassago|spider|blob|eddies|weapons|pickups|fx|hud|menu|sky|rosto|guitarra)_/.test(s);
    const varrer = (v) => {
      if (typeof v === 'string') { if (eNomeDeFrame(v) && !temQuadro(v)) faltando.add(v); }
      else if (Array.isArray(v)) v.forEach(varrer);
      else if (v && typeof v === 'object') Object.values(v).forEach(varrer);
    };
    [ARMAS, INIMIGOS, PROJETEIS_INIMIGOS, EFEITOS, ITENS, UPGRADES, CARTA_RESERVA, ROSTO].forEach(varrer);
    if (faltando.size) console.error(`Sprites citados em data/ que não existem nos atlas: ${[...faltando].join(', ')}`);
  }
}
