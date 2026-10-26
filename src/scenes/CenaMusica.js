// Tela de música (pausa > MÚSICA), no espírito do Tony Hawk's Pro Skater: troca de faixa,
// liga/desliga, volumes, aleatório/sequência e a lista com todas as músicas.
//
// Mouse: clicar em qualquer coisa. Teclado: ↑↓ escolhem a linha, ←→ ajustam (ou trocam de
// coluna na lista), ENTER toca a música escolhida, ESPAÇO marca/desmarca ela do aleatório.
import Phaser from 'phaser';
import { TELA_L, COR } from '../config.js';
import { MUSICAS } from '../data/musicas.js';
import { jukebox, VOLUME_MAX } from '../systems/Jukebox.js';
import { sons } from '../systems/Sons.js';
import { formatarTempo } from '../systems/Recorde.js';
import { texto, veu, aoTecla } from './ui.js';

const LINHAS_POR_COLUNA = Math.ceil(MUSICAS.length / 2);
const Y_LISTA = 350, ALTURA_LINHA = 23;
const X_COLUNA = [44, TELA_L / 2 + 20];
const BARRA_L = 360;

export class CenaMusica extends Phaser.Scene {
  constructor() { super('Musica'); }

  init(dados) { this.jogo = dados.jogo; }

  create() {
    this.saindo = false;
    veu(this, 0.86);
    texto(this, TELA_L / 2, 34, 'MÚSICA', 44, COR.amarelo);

    // ---- tocando agora
    texto(this, TELA_L / 2, 76, 'TOCANDO AGORA', 14, COR.cinza);
    this.txtTitulo = texto(this, TELA_L / 2, 100, '', 25, COR.branco);
    this.txtAlbum = texto(this, TELA_L / 2, 125, '', 15, COR.cinza);
    this.add.rectangle(TELA_L / 2 - BARRA_L / 2, 148, BARRA_L, 6, 0x333333).setOrigin(0, 0.5);
    this.barraTempo = this.add.rectangle(TELA_L / 2 - BARRA_L / 2, 148, 0, 6, 0xffd23a).setOrigin(0, 0.5);
    this.txtTempo = texto(this, TELA_L / 2 + BARRA_L / 2 + 14, 148, '', 14, COR.cinza, 0);

    // ---- controles: cada item sabe se desenhar e o que fazer com ENTER e ←→
    this.foco = this.add.rectangle(0, 0, 10, 10, 0xd01010, 0.35).setOrigin(0.5);
    this.itens = [];
    const controle = (y, rotulo, { enter, ajustar }) => {
      const t = texto(this, TELA_L / 2, y, '', 22, COR.vermelho);
      const item = { t, rotulo, enter: enter || (() => ajustar(1)), ajustar: ajustar || (() => enter()) };
      this.clicavel(t, item, () => item.enter());
      // setas clicáveis dos lados, para quem usa só o mouse
      if (ajustar) {
        const seta = (dx, d, s) => this.clicavel(texto(this, TELA_L / 2 + dx, y, s, 24, COR.amarelo), item, () => item.ajustar(d));
        seta(-250, -1, '◀');
        seta(250, 1, '▶');
      }
      this.itens.push(item);
      return item;
    };
    controle(178, () => 'TROCAR DE MÚSICA', { enter: () => jukebox.proxima(), ajustar: (d) => (d < 0 ? jukebox.anterior() : jukebox.proxima()) });
    controle(206, () => `MÚSICA: ${jukebox.cfg.ligada ? 'LIGADA' : 'DESLIGADA'}`, { enter: () => jukebox.alternarLigada() });
    controle(234, () => `VOLUME DA MÚSICA   ${this.barrinha(jukebox.cfg.volume)}`, { ajustar: (d) => jukebox.mudarVolume(d) });
    controle(262, () => `VOLUME DOS EFEITOS   ${this.barrinha(jukebox.cfg.efeitos)}`, { ajustar: (d) => { jukebox.mudarEfeitos(d); sons.tocar('menu'); } });
    controle(290, () => `ORDEM: ${jukebox.cfg.aleatoria ? 'ALEATÓRIA' : 'EM SEQUÊNCIA'}`, { enter: () => jukebox.alternarAleatoria() });
    this.nControles = this.itens.length;

    // ---- a lista, em duas colunas
    texto(this, TELA_L / 2, 322, '✔ = entra no aleatório   ·   ENTER: tocar agora   ·   ESPAÇO: marcar/desmarcar   ·   ESC: voltar', 13, COR.cinza);
    MUSICAS.forEach((m, i) => {
      const col = i < LINHAS_POR_COLUNA ? 0 : 1, lin = i % LINHAS_POR_COLUNA;
      const x = X_COLUNA[col], y = Y_LISTA + lin * ALTURA_LINHA;
      const caixa = texto(this, x + 9, y, '', 17, COR.amarelo);
      const t = texto(this, x + 26, y, `${m.artista}  —  ${m.titulo}`, 17, COR.branco, 0);
      const item = { t, caixa, musica: m, coluna: col, enter: () => jukebox.tocar(m), espaco: () => jukebox.alternarNaLista(m.id) };
      this.clicavel(t, item, () => item.enter());
      this.clicavel(caixa, item, () => item.espaco());
      this.itens.push(item);
    });

    const voltar = texto(this, TELA_L / 2, 572, 'VOLTAR', 28, COR.vermelho);
    const itemVoltar = { t: voltar, rotulo: () => 'VOLTAR', enter: () => this.voltar() };
    this.clicavel(voltar, itemVoltar, () => this.voltar());
    this.itens.push(itemVoltar);

    // ---- teclado
    this.indice = 0;
    aoTecla(this, 'UP', () => this.moverFoco(-1));
    aoTecla(this, 'W', () => this.moverFoco(-1));
    aoTecla(this, 'DOWN', () => this.moverFoco(1));
    aoTecla(this, 'S', () => this.moverFoco(1));
    aoTecla(this, 'LEFT', () => this.lado(-1));
    aoTecla(this, 'A', () => this.lado(-1));
    aoTecla(this, 'RIGHT', () => this.lado(1));
    aoTecla(this, 'D', () => this.lado(1));
    aoTecla(this, 'ENTER', () => this.acionar('enter'));
    aoTecla(this, 'SPACE', () => this.acionar('espaco'));
    aoTecla(this, 'M', () => sons.alternarMudo());
    // a mesma tecla que abriu a tela não pode fechá-la
    this.time.delayedCall(250, () => aoTecla(this, 'ESC', () => this.voltar()));
    this.redesenhar();
  }

  /** Deixa um texto clicável: passar o mouse dá o foco ao item, clicar executa `acao`. */
  clicavel(t, item, acao) {
    t.setInteractive({ useHandCursor: true });
    t.on('pointerover', () => { this.indice = this.itens.indexOf(item); this.redesenhar(); });
    t.on('pointerdown', () => { acao(); sons.tocar('menu'); this.redesenhar(); });
  }

  barrinha(v) { return '■'.repeat(v) + '□'.repeat(VOLUME_MAX - v); }

  moverFoco(d) {
    this.indice = (this.indice + d + this.itens.length) % this.itens.length;
    sons.tocar('menu');
    this.redesenhar();
  }

  /** ←→: ajusta o controle; na lista, pula para a outra coluna. */
  lado(d) {
    const item = this.itens[this.indice];
    if (item.ajustar) item.ajustar(d);
    else if (item.musica) {
      const i = this.indice - this.nControles + d * LINHAS_POR_COLUNA;
      if (i >= 0 && i < MUSICAS.length) this.indice = i + this.nControles;
    }
    sons.tocar('menu');
    this.redesenhar();
  }

  acionar(tecla) {
    const item = this.itens[this.indice];
    const acao = tecla === 'espaco' ? item.espaco : item.enter;
    if (!acao) return;
    acao();
    sons.tocar('confirmar');
    this.redesenhar();
  }

  redesenhar() {
    const atual = jukebox.atual;
    this.itens.forEach((item, i) => {
      const focado = i === this.indice;
      if (item.musica) {
        const naLista = jukebox.estaNaLista(item.musica.id), tocando = item.musica === atual;
        item.caixa.setText(naLista ? '✔' : '·').setColor(naLista ? COR.amarelo : '#555555');
        item.t.setText(`${tocando ? '♪ ' : ''}${item.musica.artista}  —  ${item.musica.titulo}`)
          .setColor(tocando ? COR.amarelo : focado ? COR.branco : naLista ? '#c8c8c8' : '#6a6a6a');
      } else {
        item.t.setText(item.rotulo()).setColor(focado ? COR.amarelo : COR.vermelho);
      }
    });
    const t = this.itens[this.indice].t;
    const b = t.getBounds();
    this.foco.setPosition(b.centerX, b.centerY).setSize(b.width + 24, b.height + 2);
    this.foco.setOrigin(0.5);
    this.versaoVista = jukebox.versao;
    this.ligadaVista = jukebox.cfg.ligada;
  }

  update() {
    const m = jukebox.atual;
    // a música pode trocar sozinha (acabou) enquanto a tela está aberta
    if (jukebox.versao !== this.versaoVista || jukebox.cfg.ligada !== this.ligadaVista) this.redesenhar();
    this.txtTitulo.setText(m ? `${m.artista}  —  ${m.titulo}` : '—');
    this.txtAlbum.setText(m ? `${m.album}${m.ano ? ` (${m.ano})` : ''}${jukebox.cfg.ligada ? '' : '   ·   música desligada'}` : '');
    const { atual, total } = jukebox.tempo();
    this.barraTempo.width = total ? BARRA_L * Math.min(1, atual / total) : 0;
    this.txtTempo.setText(total ? `${formatarTempo(atual)} / ${formatarTempo(total)}` : '');
  }

  voltar() {
    if (this.saindo) return;
    this.saindo = true;
    sons.tocar('menu');
    this.scene.stop();
    this.scene.launch('Pausa', { jogo: this.jogo });
  }
}
