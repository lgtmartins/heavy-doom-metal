// Tela final: game over ou vitória, com as estatísticas da run e o recorde.
import Phaser from 'phaser';
import { TELA_L, TELA_A, COR } from '../config.js';
import { salvarRecorde, formatarTempo } from '../systems/Recorde.js';
import { ONDAS } from '../data/ondas.js';
import { texto, ListaDeBotoes, travarMouse } from './ui.js';

export class CenaFim extends Phaser.Scene {
  constructor() { super('Fim'); }

  init(dados) {
    this.vitoria = dados.vitoria;
    this.stats = dados.stats;
  }

  create() {
    const s = this.stats;
    const { recorde, novo } = salvarRecorde(s, this.vitoria);

    const ampliacao = TELA_A / 128;
    this.add.tileSprite(0, 0, Math.ceil(TELA_L / ampliacao), 128, 'skies', this.vitoria ? 'sky_nuvens' : 'sky_inferno').setOrigin(0).setScale(ampliacao);
    this.add.rectangle(0, 0, TELA_L, TELA_A, this.vitoria ? 0x000000 : 0x300000, 0.72).setOrigin(0);

    texto(this, TELA_L / 2, 70, this.vitoria ? 'VOCÊ VENCEU!' : 'VOCÊ MORREU', 72, this.vitoria ? COR.amarelo : COR.vermelho);
    texto(this, TELA_L / 2, 124, this.vitoria ? 'O Eddie 80 foi destruído. O inferno vai pensar duas vezes.' : `Morto por: ${s.causaMorte || '?'}  ·  onda ${s.onda} de ${ONDAS.length}`, 20, COR.branco);

    const linhas = [
      ['Tempo', formatarTempo(s.tempo)],
      ['Onda alcançada', `${s.onda} / ${ONDAS.length}`],
      ['Inimigos abatidos', String(s.abates)],
      ['Nível', String(s.nivel)],
      ['Dano causado', String(Math.round(s.danoCausado))],
      ['Dano sofrido', String(Math.round(s.danoSofrido))],
    ];
    linhas.forEach(([rotulo, valor], i) => {
      const y = 180 + i * 34;
      texto(this, TELA_L / 2 - 16, y, rotulo, 24, COR.cinza, 1);
      texto(this, TELA_L / 2 + 16, y, valor, 24, COR.amarelo, 0);
    });

    if (novo) texto(this, TELA_L / 2, 398, 'NOVO RECORDE!', 28, COR.amarelo);
    texto(this, TELA_L / 2, 430,
      `Recorde: onda ${recorde.maiorOnda} · ${recorde.maisAbates} abates · nível ${recorde.maiorNivel}` +
      (recorde.vitorias ? ` · ${recorde.vitorias} vitória(s), melhor em ${formatarTempo(recorde.melhorVitoria)}` : ''), 16, COR.cinza);

    new ListaDeBotoes(this, TELA_L / 2, 486, [
      { rotulo: 'JOGAR DE NOVO', acao: () => { travarMouse(this); this.scene.start('Jogo'); } },
      { rotulo: 'MENU PRINCIPAL', acao: () => this.scene.start('Menu') },
    ], { tamanho: 32, espaco: 48 });
    this.time.delayedCall(400, () => {
      this.input.keyboard.once('keydown-R', () => { travarMouse(this); this.scene.start('Jogo'); });
    });
  }
}
