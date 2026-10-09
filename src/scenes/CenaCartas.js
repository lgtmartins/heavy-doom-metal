// Tela de level-up: o jogo fica pausado e o jogador escolhe 1 de 3 cartas.
import Phaser from 'phaser';
import { TELA_L, TELA_A, COR } from '../config.js';
import { sortearCartas } from '../data/upgrades.js';
import { sons } from '../systems/Sons.js';
import { texto, veu } from './ui.js';

const CARTA_L = 264, CARTA_A = 330, VAO = 26;

export class CenaCartas extends Phaser.Scene {
  constructor() { super('Cartas'); }

  init(dados) { this.jogo = dados.jogo; }

  create() {
    const jog = this.jogo.jogador;
    this.escolhida = false;
    this.liberada = false;
    // Meio segundo sem aceitar entrada: quem estava clicando para atirar não escolhe uma carta sem querer.
    this.time.delayedCall(450, () => { this.liberada = true; });

    veu(this, 0.78);
    texto(this, TELA_L / 2, 62, `NÍVEL ${jog.nivel - jog.niveisPendentes + 1}!`, 54, COR.amarelo);
    texto(this, TELA_L / 2, 110, 'Escolha um upgrade  (clique ou teclas 1, 2, 3)', 20, COR.branco);

    this.cartas = sortearCartas(jog, 3);
    const total = this.cartas.length * CARTA_L + (this.cartas.length - 1) * VAO;
    this.fundos = this.cartas.map((carta, i) => this.montarCarta(carta, i, TELA_L / 2 - total / 2 + CARTA_L / 2 + i * (CARTA_L + VAO), 320));

    this.input.keyboard.on('keydown', (ev) => {
      const n = Number(ev.key);
      if (n >= 1 && n <= this.cartas.length) this.escolher(n - 1);
    });
  }

  montarCarta(carta, i, x, y) {
    const jog = this.jogo.jogador;
    const cor = carta.nova ? 0x6a1010 : 0x2a2420;
    const fundo = this.add.rectangle(x, y, CARTA_L, CARTA_A, cor, 0.96).setStrokeStyle(4, carta.nova ? 0xffd23a : 0x8a8070);
    fundo.setInteractive({ useHandCursor: true });
    fundo.on('pointerover', () => { fundo.setStrokeStyle(6, 0xffffff); sons.tocar('menu'); });
    fundo.on('pointerout', () => fundo.setStrokeStyle(4, carta.nova ? 0xffd23a : 0x8a8070));
    fundo.on('pointerdown', () => this.escolher(i));

    texto(this, x - CARTA_L / 2 + 22, y - CARTA_A / 2 + 24, String(i + 1), 26, COR.cinza);
    if (carta.nova) texto(this, x, y - CARTA_A / 2 + 26, 'NOVO RAIO', 18, COR.amarelo);

    // o ícone vem do atlas indicado pelo prefixo do nome do frame
    const atlas = carta.icone.split('_')[0];
    const icone = this.add.image(x, y - 78, atlas, carta.icone);
    icone.setScale(Math.min(4, 200 / icone.width, 84 / icone.height));

    texto(this, x, y - 6, carta.nome.toUpperCase(), 26, COR.amarelo).setWordWrapWidth(CARTA_L - 24);
    texto(this, x, y + 62, carta.desc, 18, COR.branco).setWordWrapWidth(CARTA_L - 36);

    // progresso da carta: quantas vezes já foi pega
    const tem = jog.cartas[carta.id] || 0;
    const nivelArma = carta.arma && !carta.nova && jog.armas[carta.arma] ? jog.armas[carta.arma].nivel : 0;
    const rodape = carta.nova ? '' : carta.max >= 99 ? '' : nivelArma ? `nível ${nivelArma} → ${nivelArma + 1}` : `${tem} / ${carta.max}`;
    texto(this, x, y + CARTA_A / 2 - 24, rodape, 16, COR.cinza);
    return fundo;
  }

  escolher(i) {
    if (!this.liberada || this.escolhida) return;
    this.escolhida = true;
    const jog = this.jogo.jogador, carta = this.cartas[i];
    carta.aplicar(jog);
    jog.cartas[carta.id] = (jog.cartas[carta.id] || 0) + 1;
    jog.niveisPendentes -= 1;
    sons.tocar('confirmar');
    this.jogo.mensagem(`${carta.nome}: ${carta.desc}`);
    // Se ainda houver níveis pendentes, a cena de jogo reabre esta tela no próximo quadro.
    this.scene.stop();
    this.jogo.retomar();
  }
}
