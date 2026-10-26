// Tela de pausa (ESC ou P).
import Phaser from 'phaser';
import { TELA_L, COR } from '../config.js';
import { sons } from '../systems/Sons.js';
import { jukebox } from '../systems/Jukebox.js';
import { texto, veu, ListaDeBotoes, travarMouse, aoTecla } from './ui.js';

export class CenaPausa extends Phaser.Scene {
  constructor() { super('Pausa'); }

  init(dados) { this.jogo = dados.jogo; }

  create() {
    this.saindo = false;
    veu(this);
    this.add.image(TELA_L / 2, 110, 'menu', 'menu_1_0').setScale(4); // o "PAUSE" original do Doom

    new ListaDeBotoes(this, TELA_L / 2, 196, [
      { rotulo: 'CONTINUAR', acao: () => this.continuar() },
      { rotulo: 'MÚSICA', acao: () => this.abrirMusica() },
      { rotulo: 'REINICIAR', acao: () => this.reiniciar() },
      { rotulo: 'MENU PRINCIPAL', acao: () => this.irParaMenu() },
    ], { tamanho: 32, espaco: 48 });

    // sensibilidade do mouse: guardada no navegador
    const y = 410;
    texto(this, TELA_L / 2, y - 30, 'SENSIBILIDADE DO MOUSE', 18, COR.cinza);
    const valor = texto(this, TELA_L / 2, y + 4, '', 26, COR.amarelo);
    const mostrar = () => valor.setText(`${this.jogo.entrada.sensibilidade.toFixed(2)}x`);
    const botao = (x, rotulo, fator) => {
      const b = texto(this, x, y + 4, rotulo, 34, COR.vermelho).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => { this.jogo.entrada.ajustarSensibilidade(fator); sons.tocar('menu'); mostrar(); });
    };
    botao(TELA_L / 2 - 90, '−', 1 / 1.15);
    botao(TELA_L / 2 + 90, '+', 1.15);
    aoTecla(this, 'LEFT', () => { this.jogo.entrada.ajustarSensibilidade(1 / 1.15); mostrar(); });
    aoTecla(this, 'RIGHT', () => { this.jogo.entrada.ajustarSensibilidade(1.15); mostrar(); });
    mostrar();

    const s = this.jogo.stats;
    texto(this, TELA_L / 2, 440, `Onda ${s.onda}   ·   ${s.abates} abates   ·   nível ${this.jogo.jogador.nivel}`, 18, COR.branco);
    texto(this, TELA_L / 2, 464, 'ESC ou P: continuar   ·   R: reiniciar   ·   M: som (liga/desliga)', 16, COR.cinza);

    const m = jukebox.atual;
    if (m && jukebox.cfg.ligada) texto(this, TELA_L / 2, 488, `♪  ${m.artista}  —  ${m.titulo}`, 16, COR.amarelo);

    // Um pequeno atraso antes de aceitar ESC: a mesma tecla que abriu a pausa não pode fechá-la.
    this.time.delayedCall(250, () => {
      aoTecla(this, 'ESC', () => this.continuar());
      aoTecla(this, 'P', () => this.continuar());
      aoTecla(this, 'R', () => this.reiniciar());
    });
    aoTecla(this, 'M', () => sons.alternarMudo());
  }

  continuar() {
    if (this.saindo) return;
    this.saindo = true;
    this.scene.stop();
    this.jogo.retomar();
  }

  abrirMusica() {
    if (this.saindo) return;
    this.saindo = true;
    this.scene.stop();
    this.scene.launch('Musica', { jogo: this.jogo });
  }

  reiniciar() {
    if (this.saindo) return;
    this.saindo = true;
    travarMouse(this);
    this.scene.stop('Hud');
    this.scene.start('Jogo'); // start() numa cena pausada a encerra e recomeça do zero
  }

  irParaMenu() {
    this.scene.stop('Hud');
    this.scene.stop('Jogo');
    this.scene.start('Menu');
  }
}
