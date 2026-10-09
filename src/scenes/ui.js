// Ajudantes de interface compartilhados pelas cenas de menu.
import { FONTE, COR, TELA_L, TELA_A } from '../config.js';
import { sons } from '../systems/Sons.js';

/** Texto no estilo do jogo: fonte pesada, contorno escuro e sombra. */
export function texto(cena, x, y, conteudo, tamanho = 24, cor = COR.branco, origem = 0.5) {
  return cena.add.text(x, y, conteudo, {
    fontFamily: FONTE, fontSize: `${tamanho}px`, color: cor, align: 'center',
    stroke: '#000000', strokeThickness: Math.max(3, Math.round(tamanho / 7)),
  }).setOrigin(origem, 0.5).setShadow(2, 2, '#000000', 0, true, true);
}

/**
 * Registra uma tecla (ex.: 'ESC', 'ENTER', 'M') ignorando eventos repetidos.
 *
 * Pegadinha do Phaser: quando duas teclas chegam no mesmo quadro (o que acontece
 * o tempo todo com a auto-repetição de quem segura W), o evento da primeira é
 * emitido de novo. Sem este filtro, "M" poderia desligar e religar o som no
 * mesmo quadro. Guardar o último evento visto resolve.
 */
export function aoTecla(cena, nome, acao) {
  let ultimo = null;
  cena.input.keyboard.on(`keydown-${nome}`, (ev) => {
    if (ev === ultimo) return;
    ultimo = ev;
    acao(ev);
  });
}

/** Véu escuro de tela cheia, para as telas que ficam por cima do jogo. */
export function veu(cena, alfa = 0.72) {
  return cena.add.rectangle(0, 0, TELA_L, TELA_A, 0x100000, alfa).setOrigin(0);
}

/**
 * Lista vertical de botões com a caveira do menu do Doom como cursor.
 * Funciona com mouse (passar por cima / clicar) e teclado (setas, W/S, Enter).
 *   opcoes = [{ rotulo, acao }]
 */
export class ListaDeBotoes {
  constructor(cena, x, y, opcoes, { tamanho = 34, espaco = 52 } = {}) {
    this.cena = cena;
    this.opcoes = opcoes;
    this.indice = 0;
    this.travada = true;
    // Ignora entrada por um instante: evita que o clique/tecla que abriu a tela já escolha algo.
    cena.time.delayedCall(350, () => { this.travada = false; });

    this.textos = opcoes.map((op, i) => {
      const t = texto(cena, x, y + i * espaco, op.rotulo, tamanho, COR.vermelho);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.selecionar(i));
      t.on('pointerdown', () => { this.selecionar(i); this.confirmar(); });
      return t;
    });
    this.caveira = cena.add.image(0, 0, 'menu', 'menu_0_0').setScale(2.2);
    cena.time.addEvent({ delay: 260, loop: true, callback: () => this.caveira.setFrame(this.caveira.frame.name === 'menu_0_0' ? 'menu_0_1' : 'menu_0_0') });

    aoTecla(cena, 'UP', () => this.mover(-1));
    aoTecla(cena, 'W', () => this.mover(-1));
    aoTecla(cena, 'DOWN', () => this.mover(1));
    aoTecla(cena, 'S', () => this.mover(1));
    aoTecla(cena, 'ENTER', () => this.confirmar());
    this.selecionar(0, true);
  }

  mover(d) { this.selecionar((this.indice + d + this.opcoes.length) % this.opcoes.length); }

  selecionar(i, silencioso = false) {
    if (i !== this.indice && !silencioso) sons.tocar('menu');
    this.indice = i;
    this.textos.forEach((t, k) => t.setColor(k === i ? COR.amarelo : COR.vermelho));
    const t = this.textos[i];
    this.caveira.setPosition(t.x - t.displayWidth / 2 - 34, t.y);
  }

  confirmar() {
    if (this.travada) return;
    this.travada = true; // uma escolha só
    sons.iniciar();
    sons.tocar('confirmar');
    this.opcoes[this.indice].acao();
  }
}

/** Trava o mouse no canvas. Tem de ser chamado dentro de um clique ou tecla. */
export function travarMouse(cena) {
  try {
    const p = cena.game.canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch { /* navegador sem suporte: o jogo funciona pelo teclado */ }
}
