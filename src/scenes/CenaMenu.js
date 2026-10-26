// Menu inicial, com quatro telas: principal, "como jogar", recordes e créditos.
//
// Todas são a MESMA cena. Trocar de tela é reiniciar a cena passando qual tela
// mostrar (scene.restart({ tela })): o Phaser limpa objetos e teclas da tela
// anterior sozinho, então não há nada para esconder/mostrar à mão.
import Phaser from 'phaser';
import { TELA_L, TELA_A, COR } from '../config.js';
import { lerRecorde, formatarTempo } from '../systems/Recorde.js';
import { ONDAS } from '../data/ondas.js';
import { sons } from '../systems/Sons.js';
import { jukebox } from '../systems/Jukebox.js';
import { texto, ListaDeBotoes, travarMouse, aoTecla } from './ui.js';

const CONTROLES = [
  ['WASD', 'andar (A/D andam de lado)'],
  ['MOUSE', 'mirar  ·  setas ou Q/E também giram'],
  ['CLIQUE (segurar)', 'atirar'],
  ['ESPAÇO', 'dash (fica invencível durante)'],
  ['1-5 / SCROLL', 'trocar de raio'],
  ['BOTÃO DIREITO', 'Solo Final (quando tiver)'],
  ['ESC / P', 'pausa (e a tela de MÚSICA)   ·   M: som'],
];

const AUTOR = 'Luiz Guilherme Tiritan Martins';
const URL_SPRITES = 'https://www.spriters-resource.com/ms_dos/doomdoomii/';

const DICAS = [
  'Recolha as poções azuis: são o XP. A cada nível você escolhe 1 de 3 upgrades.',
  'O radar (canto superior direito) mostra quem vem pelas costas.',
  'Deathbats explodem: mate de longe. Eddies Powerslave atiram: são alvo prioritário.',
  'Use os pilares como cobertura contra a metralhadora do chefão.',
];

export class CenaMenu extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(dados) { this.tela = dados?.tela || 'principal'; }

  create() {
    this.saindo = false; // a instância da cena é reaproveitada: zera o estado a cada entrada
    // fundo fixo: a pintura das catedrais (Assets/heavy/fundo-menu.png), já no tamanho da tela
    this.add.image(0, 0, 'fundoMenu').setOrigin(0);
    // degradê escuro por cima, mais forte embaixo, para os botões ficarem legíveis
    const g = this.add.graphics();
    g.fillGradientStyle(0x000000, 0x000000, 0x100000, 0x100000, 0.1, 0.1, 0.78, 0.78);
    g.fillRect(0, 0, TELA_L, TELA_A);

    if (this.tela === 'comoJogar') this.telaComoJogar();
    else if (this.tela === 'recordes') this.telaRecordes();
    else if (this.tela === 'creditos') this.telaCreditos();
    else this.telaPrincipal();

    // música do menu (Dream Evil). O navegador só libera som depois do primeiro clique ou
    // tecla; até lá o rodapé avisa
    jukebox.menu();
    this.txtMusica = texto(this, TELA_L / 2, TELA_A - 12, '', 14, COR.cinza);
  }

  update() {
    const m = jukebox.atual;
    this.txtMusica.setText(!jukebox.cfg.ligada ? ''
      : jukebox.esperandoGesto ? '♪  clique ou aperte uma tecla para ligar o som'
      : m ? `♪  ${m.artista}  —  ${m.titulo}` : '');
  }

  /**
   * Faz o logo piscar como letreiro de neon com mau contato: fica aceso quase o tempo
   * todo e, de tempos em tempos, dá uma rajada de 2 a 4 piscadas rápidas.
   * Os temporizadores de 	his.time morrem sozinhos quando a cena troca de tela.
   *   PISCADA     ms de cada apagão (e de cada volta a acender)
   *   APAGADO     quão apagado ele fica (0 = some, 1 = não muda)
   *   ENTRE       intervalo entre uma rajada e outra, em ms [mínimo, máximo]
   */
  piscarLogo(logo) {
    const PISCADA = 70, APAGADO = 0.15, ENTRE = [1500, 4000];
    const rajada = () => {
      const piscadas = Phaser.Math.Between(2, 4);
      for (let i = 0; i < piscadas; i++) {
        this.time.delayedCall(i * PISCADA * 2, () => logo.setAlpha(APAGADO));
        this.time.delayedCall(i * PISCADA * 2 + PISCADA, () => logo.setAlpha(1));
      }
      this.time.delayedCall(Phaser.Math.Between(ENTRE[0], ENTRE[1]), rajada);
    };
    this.time.delayedCall(800, rajada);
  }

  // ----------------------------------------------------------------- telas

  telaPrincipal() {
    // o logo HEAVY DOOM METAL (Assets/heavy/menu.png, já aparado e com 300 px de altura), piscando
    this.piscarLogo(this.add.image(TELA_L / 2, 162, 'logo'));
    texto(this, TELA_L / 2, 330, `sobreviva a ${ONDAS.length} ondas e derrote o Eddie 80`, 18, COR.cinza);

    new ListaDeBotoes(this, TELA_L / 2, 384, [
      { rotulo: 'NOVO JOGO', acao: () => this.iniciar() },
      { rotulo: 'COMO JOGAR?', acao: () => this.scene.restart({ tela: 'comoJogar' }) },
      { rotulo: 'RECORDS', acao: () => this.scene.restart({ tela: 'recordes' }) },
      { rotulo: 'CRÉDITOS', acao: () => this.scene.restart({ tela: 'creditos' }) },
    ], { tamanho: 36, espaco: 52 });
  }

  telaCreditos() {
    texto(this, TELA_L / 2, 48, 'CRÉDITOS', 50, COR.amarelo);
    let y = 96;
    // cada bloco: título amarelo e as linhas logo abaixo
    const bloco = (titulo, linhas, cor = COR.branco) => {
      texto(this, TELA_L / 2, y, titulo, 18, COR.amarelo);
      y += 21;
      for (const l of linhas) { texto(this, TELA_L / 2, y, l, 16, cor); y += 19; }
      y += 5;
    };
    bloco('DESENVOLVIDO POR', [AUTOR, 'Disciplina de Jogos Digitais']);
    bloco('INIMIGOS', ['Eddie: mascote do Iron Maiden  ·  Deathbat: mascote do Avenged Sevenfold']);
    bloco('ARTE ADICIONAL', ['Rosto do roqueiro, guitarra, logo, pintura do menu e céu da arena: imagens reunidas pelo autor'], COR.cinza);
    bloco('SPRITES, ITENS E HUD', ['© id Software / Bethesda  —  DOOM, DOOM II e Legacy of Rust']);
    // o endereço é clicável: abre a página das sheets numa aba nova
    texto(this, TELA_L / 2, y - 6, 'Sheets obtidas em The Spriters Resource:', 16, COR.branco);
    // em Arial e com folga embaixo: na fonte Impact o "_" de ms_dos é cortado e some
    const link = texto(this, TELA_L / 2, y + 15, URL_SPRITES.replace('https://', ''), 16, '#7fb2ff')
      .setFontFamily('Arial, sans-serif').setFontStyle('bold').setPadding(0, 0, 0, 4)
      .setInteractive({ useHandCursor: true });
    link.on('pointerdown', () => window.open(URL_SPRITES, '_blank'));
    y += 37;
    bloco('RIPS DOS SPRITES', ['Dolphman  ·  Planz Doom  ·  MG12  ·  PGE  ·  DaColGy  ·  16-Bit Globe  ·  SuperDave938'], COR.cinza);
    bloco('EFEITOS SONOROS', ['© id Software  —  rips de Nai255 e InfamousLazure  ·  choque dos raios e riffs do level-up: fornecidos pelo autor'], COR.cinza);
    bloco('TRILHA SONORA', ['As músicas pertencem aos seus artistas: veja a lista em pausa > MÚSICA'], COR.cinza);
    bloco('TECNOLOGIA', ['Phaser 3 + Vite  ·  texturas da catedral geradas por código'], COR.cinza);
    this.botaoVoltar(554);
  }

  telaComoJogar() {
    texto(this, TELA_L / 2, 62, 'COMO JOGAR?', 52, COR.amarelo);
    CONTROLES.forEach(([tecla, acao], i) => {
      const y = 132 + i * 34;
      texto(this, TELA_L / 2 - 30, y, tecla, 23, COR.amarelo, 1);
      texto(this, TELA_L / 2 - 6, y, acao, 23, COR.branco, 0);
    });
    DICAS.forEach((dica, i) => texto(this, TELA_L / 2, 394 + i * 26, dica, 17, COR.cinza));
    this.botaoVoltar();
  }

  telaRecordes() {
    texto(this, TELA_L / 2, 62, 'RECORDS', 52, COR.amarelo);
    const r = lerRecorde();
    if (r.maisAbates === 0 && r.maiorTempo === 0) {
      texto(this, TELA_L / 2, 270, 'Nenhuma run registrada ainda.', 26, COR.cinza);
      texto(this, TELA_L / 2, 308, 'Jogue uma partida e volte aqui.', 20, COR.cinza);
    } else {
      const linhas = [
        ['Maior onda alcançada', `${r.maiorOnda} / ${ONDAS.length}`],
        ['Mais inimigos abatidos', String(r.maisAbates)],
        ['Maior nível', String(r.maiorNivel)],
        ['Maior tempo de sobrevivência', formatarTempo(r.maiorTempo)],
        ['Vitórias', String(r.vitorias)],
        ['Vitória mais rápida', r.vitorias ? formatarTempo(r.melhorVitoria) : '—'],
      ];
      linhas.forEach(([rotulo, valor], i) => {
        const y = 150 + i * 46;
        texto(this, TELA_L / 2 + 40, y, rotulo, 26, COR.cinza, 1);
        texto(this, TELA_L / 2 + 70, y, valor, 26, COR.amarelo, 0);
      });
      texto(this, TELA_L / 2, 446, 'Cada marca é a melhor entre todas as runs; ficam salvas neste navegador.', 15, COR.cinza);
    }
    this.botaoVoltar();
  }

  botaoVoltar(y = 530) {
    const voltar = () => this.scene.restart({ tela: 'principal' });
    new ListaDeBotoes(this, TELA_L / 2, y, [{ rotulo: 'VOLTAR', acao: voltar }], { tamanho: 34 });
    aoTecla(this, 'ESC', () => { sons.tocar('menu'); voltar(); });
  }

  iniciar() {
    if (this.saindo) return;
    this.saindo = true;
    sons.iniciar();
    travarMouse(this);
    // a música do menu some e a tela escurece juntas; o jogo entra clareando (CenaJogo)
    const FADE = 1100;
    jukebox.sairDoMenu(FADE);
    this.cameras.main.fadeOut(FADE, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Jogo'));
  }
}
