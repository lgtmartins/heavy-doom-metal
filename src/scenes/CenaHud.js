// HUD no estilo da barra de status do Doom. Roda em paralelo com a cena de jogo
// (scene.launch) e só LÊ o estado dela: nenhuma regra do jogo mora aqui.
import Phaser from 'phaser';
import { ESCALA, VISTA_A, TELA_L, TELA_A, FONTE, COR } from '../config.js';
import { ARMAS, ORDEM_ARMAS } from '../data/armas.js';
import { ROSTO } from '../data/rosto.js';
import { JOGADOR } from '../entities/Jogador.js';
import { formatarTempo } from '../systems/Recorde.js';
import { texto } from './ui.js';

const Y0 = VISTA_A * ESCALA;          // topo da barra (504)
const ALT = TELA_A - Y0;              // 96
const E = ESCALA;
// colunas da barra, em pixels "lógicos" de 320 (multiplicados por 3 na tela)
const COL = { arma: [0, 70], vida: [70, 128], rosto: [128, 162], armadura: [162, 220], onda: [220, 254], tempo: [254, 291], nivel: [291, 320] };

export class CenaHud extends Phaser.Scene {
  constructor() { super('Hud'); }

  init(dados) { this.jogo = dados.jogo; }

  create() {
    this.tRosto = 0;
    this.rostoEspecial = null;   // 'dor' | 'dorDeLado' | 'sorriso' (chaves de data/rosto.js)
    this.rostoEspelhado = false;
    this.tRostoEspecial = 0;
    this.colunaRosto = 0;
    this.tMensagem = 0;
    this.tAnuncio = 0;

    this.montarBarra();
    this.montarVista();

    const ev = this.jogo.events;
    ev.on('mensagem', this.mostrarMensagem, this);
    ev.on('anuncio', this.mostrarAnuncio, this);
    ev.on('ferido', this.aoFerido, this);
    ev.on('sorriso', this.sorrir, this);
    this.events.once('shutdown', () => {
      ev.off('mensagem', this.mostrarMensagem, this);
      ev.off('anuncio', this.mostrarAnuncio, this);
      ev.off('ferido', this.aoFerido, this);
      ev.off('sorriso', this.sorrir, this);
    });
  }

  // ------------------------------------------------------------- montagem

  montarBarra() {
    // fundo: o trecho de pedra da barra original, repetido
    for (let x = 0; x < TELA_L; x += 360) this.add.image(x, Y0, 'hud', 'hud_pedra').setOrigin(0).setDisplaySize(360, ALT);
    const g = this.add.graphics();
    const caixa = ([a, b], escura = 0.5) => {
      const x = a * E + 4, w = (b - a) * E - 8, y = Y0 + 12, h = ALT - 18;
      g.fillStyle(0x000000, escura).fillRect(x, y, w, h);
      g.lineStyle(2, 0x000000, 0.8).beginPath().moveTo(x, y + h).lineTo(x, y).lineTo(x + w, y).strokePath();
      g.lineStyle(2, 0x9a9a9a, 0.55).beginPath().moveTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).strokePath();
    };
    Object.entries(COL).forEach(([nome, col]) => caixa(col, nome === 'rosto' ? 0.9 : 0.5));
    const meio = ([a, b]) => ((a + b) / 2) * E;
    const rotulo = (col, t) => this.add.text(meio(col), TELA_A - 9, t, { fontFamily: FONTE, fontSize: '13px', color: '#c9c0b0' }).setOrigin(0.5, 1);
    rotulo(COL.vida, 'VIDA');
    rotulo(COL.armadura, 'ARMADURA');
    rotulo(COL.onda, 'ONDA');
    rotulo(COL.tempo, 'TEMPO');
    rotulo(COL.nivel, 'NÍVEL');

    // barra de XP: faixa fina no topo da barra de status
    this.add.rectangle(0, Y0, TELA_L, 8, 0x05060c).setOrigin(0);
    this.xp = this.add.rectangle(0, Y0 + 1, 0, 6, 0x3aa0ff).setOrigin(0);

    // arma atual: ícone, nome e os 6 "slots"
    // o atlas de um ícone é o prefixo do nome do frame: 'guitarra_icone' -> atlas 'guitarra'
    const iconeInicial = ARMAS[ORDEM_ARMAS[0]].icone;
    this.iconeArma = this.add.image(meio(COL.arma), Y0 + 34, iconeInicial.split('_')[0], iconeInicial).setScale(2.4);
    this.nomeArma = this.add.text(meio(COL.arma), Y0 + 58, '', { fontFamily: FONTE, fontSize: '14px', color: '#e8e0d0' }).setOrigin(0.5);
    this.slots = ORDEM_ARMAS.map((_, i) => this.add.text(COL.arma[0] * E + 24 + i * 32, TELA_A - 9, String(i + 1), { fontFamily: FONTE, fontSize: '17px', color: '#444444' }).setOrigin(0.5, 1));

    // números grandes vermelhos (frames hud_num_N) para vida e armadura
    const numeros = (col) => {
      // 3 dígitos de 14 px + "%" de 15 px, ampliados para caber na coluna
      const esc = 36 / 14, x0 = col[0] * E + 13;
      // origem à direita: o "1" é mais estreito e fica alinhado como no Doom
      const dig = [0, 1, 2].map(i => this.add.image(x0 + (i + 1) * 36, Y0 + 20, 'hud', 'hud_num_0').setOrigin(1, 0).setScale(esc));
      this.add.image(x0 + 108, Y0 + 20, 'hud', 'hud_pct').setOrigin(0).setScale(esc);
      return dig;
    };
    this.digVida = numeros(COL.vida);
    this.digArmadura = numeros(COL.armadura);

    // os rostos já vêm no tamanho de exibição (78 px de altura), por isso sem setScale
    this.rosto = this.add.image(meio(COL.rosto), Y0 + 14 + (ALT - 20) / 2, 'rosto', ROSTO.parado[0][0]);

    const valor = (col) => this.add.text(meio(col), Y0 + 42, '', { fontFamily: FONTE, fontSize: '28px', color: COR.amarelo, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.txtOnda = valor(COL.onda);
    this.txtTempo = valor(COL.tempo);
    this.txtNivel = valor(COL.nivel);
  }

  montarVista() {
    const cx = TELA_L / 2, cy = Y0 / 2;
    // mira
    this.add.rectangle(cx, cy, 4, 4, 0xffffff, 0.9);
    this.add.rectangle(cx, cy, 20, 2, 0xffffff, 0.35);
    this.add.rectangle(cx, cy, 2, 20, 0xffffff, 0.35);

    // medidores acima da barra: dash e BFG
    const medidor = (x, rotulo, cor) => {
      const fundo = this.add.rectangle(x, Y0 - 16, 104, 10, 0x000000, 0.6);
      const barra = this.add.rectangle(x - 50, Y0 - 16, 100, 6, cor).setOrigin(0, 0.5);
      const t = this.add.text(x, Y0 - 30, rotulo, { fontFamily: FONTE, fontSize: '13px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      return { barra, texto: t, fundo };
    };
    this.medDash = medidor(70, 'DASH [ESPAÇO]', 0x40d0ff);
    this.medBfg = medidor(190, 'SOLO [BOTÃO DIR.]', 0x50ff60);

    // setas de dano: de que lado veio o golpe
    const seta = (x, y, w, h) => this.add.rectangle(x, y, w, h, 0xff0000).setAlpha(0);
    this.setas = {
      frente: seta(cx, 10, 420, 16), tras: seta(cx, Y0 - 10, 420, 16),
      esq: seta(10, cy, 16, 300), dir: seta(TELA_L - 10, cy, 16, 300),
    };

    // barra do chefão
    this.chefe = this.add.container(cx, 34).setVisible(false);
    this.chefeBarra = this.add.rectangle(-298, 0, 596, 14, 0xd01010).setOrigin(0, 0.5);
    this.chefeNome = texto(this, 0, -19, 'SPIDER MASTERMIND', 18, COR.branco);
    this.chefe.add([this.add.rectangle(0, 0, 604, 20, 0x000000, 0.75).setStrokeStyle(2, 0x888888), this.chefeBarra, this.chefeNome]);

    // mensagens (canto superior esquerdo, como no Doom) e anúncios (centro)
    this.txtMensagem = texto(this, 12, 18, '', 18, COR.amarelo, 0).setAlpha(0);
    this.txtPoder = texto(this, 12, 44, '', 17, '#ff7050', 0);
    this.txtAnuncio = texto(this, cx, 150, '', 54, COR.vermelho).setAlpha(0);
    this.txtSub = texto(this, cx, 196, '', 22, COR.branco).setAlpha(0);
    this.txtMouse = texto(this, cx, Y0 - 60, 'CLIQUE NA TELA PARA CAPTURAR O MOUSE', 18, COR.branco).setVisible(false);
    this.txtVivos = texto(this, TELA_L - 12, 150, '', 15, COR.cinza, 1);
  }

  // ---------------------------------------------------------------- eventos

  mostrarMensagem(t) {
    this.txtMensagem.setText(t).setAlpha(1);
    this.tMensagem = 3;
  }

  mostrarAnuncio(titulo, sub) {
    this.txtAnuncio.setText(titulo).setAlpha(1).setScale(1.3);
    this.txtSub.setText(sub).setAlpha(1);
    this.tAnuncio = 3.2;
  }

  aoFerido(rel) {
    // rel: 0 = de frente; positivo = pela direita; ±PI = pelas costas
    const a = Math.abs(rel);
    const s = a < Math.PI / 4 ? this.setas.frente : a > (3 * Math.PI) / 4 ? this.setas.tras : rel > 0 ? this.setas.dir : this.setas.esq;
    s.setAlpha(0.85);
    const deLado = a >= Math.PI / 4 && a <= (3 * Math.PI) / 4;
    this.rostoEspecial = deLado ? 'dorDeLado' : 'dor'; // chave de data/rosto.js
    this.rostoEspelhado = deLado && rel > 0;           // golpe pela direita: vira o rosto para a direita
    this.tRostoEspecial = 0.8;
  }

  // ------------------------------------------------------------------ loop

  update(_t, delta) {
    const dt = delta / 1000;
    const jogo = this.jogo, jog = jogo.jogador, armas = jogo.armas, dir = jogo.diretor;

    this.definirNumero(this.digVida, Math.ceil(jog.vida));
    this.definirNumero(this.digArmadura, Math.floor(jog.armadura));
    this.xp.width = TELA_L * Math.min(1, jog.xp / jog.xpProx);
    this.txtOnda.setText(dir.fase === 'chefe' || dir.fase === 'avisoChefe' ? '!!' : `${dir.numeroDaOnda}/${dir.totalDeOndas}`);
    this.txtTempo.setText(formatarTempo(jogo.stats.tempo));
    this.txtNivel.setText(String(jog.nivel));
    this.txtVivos.setText(jogo.horda.vivos > 0 ? `${jogo.horda.vivos} inimigos` : '');

    // arma
    const arma = armas.def;
    if (this.iconeArma.frame.name !== arma.icone) this.iconeArma.setTexture(arma.icone.split('_')[0], arma.icone);
    this.nomeArma.setText(`${arma.nome}${jog.armas[arma.id].nivel > 1 ? ` Nv${jog.armas[arma.id].nivel}` : ''}`);
    ORDEM_ARMAS.forEach((id, i) => this.slots[i].setColor(id === armas.atual ? '#ffffff' : jog.armas[id] ? '#ffd23a' : '#444444'));

    // medidores
    const dashTotal = JOGADOR.dash.recarga * jog.mods.dashRecarga;
    const dashPronto = jog.dashRecarga <= 0;
    this.medDash.barra.width = 100 * (dashPronto ? 1 : 1 - jog.dashRecarga / dashTotal);
    this.medDash.barra.setFillStyle(dashPronto ? 0x40d0ff : 0x666666);
    const temBfg = !!jog.armas.bfg;
    this.medBfg.barra.setVisible(temBfg);
    this.medBfg.texto.setVisible(temBfg);
    this.medBfg.fundo.setVisible(temBfg);
    if (temBfg) {
      const pronta = armas.tBfg <= 0;
      this.medBfg.barra.width = 100 * (pronta ? 1 : 1 - armas.tBfg / armas.recargaBfg);
      this.medBfg.barra.setFillStyle(pronta ? 0x50ff60 : 0x666666);
    }

    this.atualizarRosto(dt, jog);

    // chefão
    const chefe = jogo.horda.chefe;
    const mostrar = !!chefe && chefe.def && chefe.def.chefe && (chefe.vivo || jogo.fim === 'vitoria');
    this.chefe.setVisible(mostrar);
    if (mostrar) {
      this.chefeBarra.width = 596 * Math.max(0, chefe.vida / chefe.vidaMax);
      const furia = chefe.chefe && chefe.chefe.furia;
      this.chefeBarra.setFillStyle(furia ? 0xff7a00 : 0xd01010);
      this.chefeNome.setText(furia ? 'SPIDER MASTERMIND — EM FÚRIA' : 'SPIDER MASTERMIND');
    }

    // textos que somem
    for (const s of Object.values(this.setas)) if (s.alpha > 0) s.alpha = Math.max(0, s.alpha - dt * 1.6);
    if (this.tMensagem > 0) { this.tMensagem -= dt; this.txtMensagem.setAlpha(Math.min(1, this.tMensagem)); }
    if (this.tAnuncio > 0) {
      this.tAnuncio -= dt;
      const a = Math.max(0, Math.min(1, this.tAnuncio));
      this.txtAnuncio.setAlpha(a).setScale(1 + Math.max(0, this.tAnuncio - 2.9) * 1.2);
      this.txtSub.setAlpha(a);
    }
    const poderes = [];
    if (jog.tBerserk > 0) poderes.push(`BERSERK ${Math.ceil(jog.tBerserk)}s`);
    if (jog.tInvul > 0) poderes.push(`INVULNERÁVEL ${Math.ceil(jog.tInvul)}s`);
    this.txtPoder.setText(poderes.join('   '));
    this.txtMouse.setVisible(!jogo.entrada.travado && !jogo.fim && jogo.scene.isActive() && jogo.stats.tempo > 0.5);
  }

  /** Mostra um número de até 3 dígitos com os frames hud_num_N, sem zeros à esquerda. */
  definirNumero(digitos, valor) {
    const v = Math.max(0, Math.min(999, valor));
    const s = String(v).padStart(3, ' ');
    for (let i = 0; i < 3; i++) {
      digitos[i].setVisible(s[i] !== ' ');
      if (s[i] !== ' ') digitos[i].setFrame(`hud_num_${s[i]}`);
    }
  }

  /**
   * O rosto do roqueiro. Qual frame aparece em cada situação está em data/rosto.js;
   * aqui só se decide a SITUAÇÃO (morto > invulnerável > reação recente > berserk > parado)
   * e o nível de saúde, de 0 (inteiro) a 4 (quase morto).
   */
  atualizarRosto(dt, jog) {
    const saude = jog.vida / jog.vidaMax;
    const nivel = saude > 0.8 ? 0 : saude > 0.6 ? 1 : saude > 0.4 ? 2 : saude > 0.2 ? 3 : 4;
    this.tRosto -= dt;
    if (this.tRosto <= 0) { this.tRosto = 0.5 + Math.random() * 0.8; this.colunaRosto = Phaser.Math.Between(0, 2); }
    if (this.tRostoEspecial > 0) this.tRostoEspecial -= dt;
    let nome, espelhar = false;
    if (jog.morto) nome = ROSTO.morto;
    else if (jog.tInvul > 0) nome = ROSTO.invulneravel;
    else if (this.tRostoEspecial > 0) {
      nome = ROSTO[this.rostoEspecial][nivel];
      espelhar = this.rostoEspelhado; // a arte de "dor de lado" olha para a esquerda; espelhada, olha para a direita
    } else if (jog.tBerserk > 0) nome = ROSTO.raiva[nivel];
    else {
      const variacoes = ROSTO.parado[nivel];
      nome = variacoes[this.colunaRosto % variacoes.length];
    }
    if (this.rosto.frame.name !== nome) this.rosto.setFrame(nome);
    this.rosto.setFlipX(espelhar);
  }

  /** Sorriso ao pegar item. */
  sorrir() {
    this.rostoEspecial = 'sorriso';
    this.rostoEspelhado = false;
    this.tRostoEspecial = 1.2;
  }
}
