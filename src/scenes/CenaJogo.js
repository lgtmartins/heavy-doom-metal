// Cena principal: junta todos os sistemas, roda o loop do jogo e desenha a vista 3D.
//
// As outras cenas ficam POR CIMA desta: o HUD roda em paralelo o tempo todo, e as
// telas de cartas/pausa pausam esta cena (scene.pause) e a retomam ao fechar.
import Phaser from 'phaser';
import { ESCALA, VISTA_L, VISTA_A, TELA_L, ALTURA_OLHO, DEBUG } from '../config.js';
import { Mapa } from '../data/mapa.js';
import { EFEITOS } from '../data/inimigos.js';
import { ORDEM_ARMAS } from '../data/armas.js';
import { Raycaster } from '../render/Raycaster.js';
import { quadro } from '../render/BancoDeSprites.js';
import { Jogador } from '../entities/Jogador.js';
import { Projeteis } from '../entities/Projeteis.js';
import { Itens } from '../entities/Itens.js';
import { Efeitos } from '../entities/Efeitos.js';
import { ferirInimigo } from '../entities/Inimigo.js';
import { Horda } from '../systems/Horda.js';
import { Armas } from '../systems/Armas.js';
import { Diretor } from '../systems/Diretor.js';
import { CampoDeFluxo } from '../systems/CampoDeFluxo.js';
import { Entrada } from '../systems/Entrada.js';
import { sons } from '../systems/Sons.js';
import { jukebox } from '../systems/Jukebox.js';
import { aoTecla } from './ui.js';

const RADAR = { x: VISTA_L - 27, y: 27, raio: 23, alcance: 17 };
const BASE_ARMA = VISTA_A * ESCALA;
/** O atlas de um frame é o prefixo do nome: 'weapons_1_9' -> 'weapons', 'guitarra_idle' -> 'guitarra'. */
const atlasDe = (quadro) => quadro.split('_')[0];

export class CenaJogo extends Phaser.Scene {
  constructor() { super('Jogo'); }

  create() {
    // IMPORTANTE: create() roda de novo a cada "reiniciar". Todo o estado da run
    // é criado aqui, nunca em variáveis globais, para a run nova começar limpa.
    this.stats = { tempo: 0, abates: 0, onda: 0, nivel: 1, danoCausado: 0, danoSofrido: 0, danoPor: {}, causaMorte: '' };
    this.mapa = new Mapa();
    this.campo = new CampoDeFluxo(this.mapa);
    // céu: as nuvens roxas com o rosto do Eddie (Assets/heavy/purple_sky.png); o tile cobre meia volta, por isso 2 repetições
    this.rc = new Raycaster(this.mapa, this.registry.get('texturas'), { ...quadro('cenario_ceu'), repeticoes: 2 });
    this.jogador = new Jogador(this);
    this.horda = new Horda(this);
    this.projeteis = new Projeteis(this);
    this.itens = new Itens(this);
    this.efeitos = new Efeitos(this);
    this.armas = new Armas(this);
    this.diretor = new Diretor(this);
    this.entrada = new Entrada(this);

    this.tremor = 0;
    this.luz = 0;
    this.tCampo = 0;
    this.fim = null;          // null | 'derrota' | 'vitoria'
    this.tFim = 0;
    this.sobreposta = false;  // true enquanto há uma tela por cima (cartas, pausa, fim)
    this.olho = ALTURA_OLHO;
    this.deus = false;
    this.campo.atualizar(this.jogador.x, this.jogador.y);

    // ---- a vista 3D: uma textura de canvas que recebe o buffer do raycaster a cada quadro
    this.texVista = this.textures.exists('vista') ? this.textures.get('vista') : this.textures.createCanvas('vista', VISTA_L, VISTA_A);
    this.imgVista = this.add.image(0, 0, 'vista').setOrigin(0).setScale(ESCALA);
    // ---- a arma em primeira pessoa e o clarão do tiro (sprites normais do Phaser)
    this.imgClarao = this.add.image(TELA_L / 2, 0, 'weapons', 'weapons_0_0').setOrigin(0.5, 1).setScale(ESCALA).setVisible(false);
    this.imgArma = this.add.image(TELA_L / 2, BASE_ARMA, atlasDe(this.armas.quadroArma), this.armas.quadroArma).setOrigin(0.5, 1).setScale(ESCALA);
    // ---- clarões de tela cheia: dano (vermelho), item (amarelo) e berserk
    const cheio = (cor) => this.add.rectangle(0, 0, TELA_L, BASE_ARMA, cor).setOrigin(0).setAlpha(0);
    this.flashDano = cheio(0xff0000);
    this.flashItem = cheio(0xffd040);
    this.veuBerserk = cheio(0xff2000);

    this.registrarTeclas();
    this.events.on('trava', (travado) => {
      // O ESC destrava o mouse (regra do navegador): tratamos isso como "pausar".
      if (!travado && !this.sobreposta && !this.fim) this.pausar();
    });
    this.events.on('resume', () => { this.sobreposta = false; this.entrada.soltarTudo(); });
    this.events.once('shutdown', () => {
      this.events.off('trava');
      this.events.off('resume');
      this.input.keyboard.removeAllListeners();
      this.input.removeAllListeners();
      if (window.__doom === this) window.__doom = null;
    });

    this.scene.launch('Hud', { jogo: this });
    sons.iniciar();
    jukebox.partida(); // a música continua de uma partida para a outra
    this.cameras.main.fadeIn(500);
    if (DEBUG) { window.__doom = this; window.__sons = sons; window.__jukebox = jukebox; }
  }

  registrarTeclas() {
    const kb = this.input.keyboard;
    kb.on('keydown', (ev) => {
      const n = Number(ev.key);
      if (n >= 1 && n <= 6) { this.armas.anterior = null; this.armas.trocar(ORDEM_ARMAS[n - 1]); }
    });
    aoTecla(this, 'ESC', () => this.pausar());
    aoTecla(this, 'P', () => this.pausar());
    aoTecla(this, 'M', () => this.mensagem(sons.alternarMudo() ? 'Som desligado' : 'Som ligado'));
    this.input.on('wheel', (_p, _o, _dx, dy) => { if (dy) this.armas.ciclar(dy > 0 ? 1 : -1); });
    if (DEBUG) {
      // atalhos de teste (só com ?debug na URL)
      aoTecla(this, 'K', () => this.horda.danoEmArea(this.jogador.x, this.jogador.y, 99, 99999));
      aoTecla(this, 'N', () => { this.diretor.t = 9999; });
      aoTecla(this, 'B', () => { this.diretor.indice = this.diretor.totalDeOndas - 1; this.diretor.avisarChefe(); });
      aoTecla(this, 'L', () => this.jogador.ganharXp(this.jogador.xpProx));
      aoTecla(this, 'G', () => { this.deus = !this.deus; this.mensagem(`Modo deus: ${this.deus}`); });
    }
  }

  // ====================================================================== loop

  update(_tempo, delta) {
    // delta vem em milissegundos. Limitar a 50 ms evita "teleportes" quando a aba
    // fica em segundo plano e volta com um delta gigante.
    const dt = Math.min(delta, 50) / 1000;
    if (!this.simular(dt)) return; // a run acabou e a cena foi trocada
    this.desenhar(dt);
    if (this.jogador.niveisPendentes > 0 && !this.fim && !this.sobreposta) this.abrirCartas();
  }

  /** Um passo da simulação. Devolve false se a cena foi encerrada. */
  simular(dt) {
    const jog = this.jogador;

    if (this.fim) {
      this.tFim -= dt;
      if (this.fim === 'vitoria') this.fogosDaVitoria(dt);
      if (this.tFim <= 0) { this.encerrar(); return false; }
    } else {
      this.stats.tempo += dt;
      this.stats.nivel = jog.nivel;
    }
    if (this.deus) jog.tInvencivel = 1;

    jog.atualizar(dt, this.entrada);
    // o campo de fluxo não precisa ser refeito todo quadro: 5 vezes por segundo basta
    this.tCampo -= dt;
    if (this.tCampo <= 0) { this.tCampo = 0.2; this.campo.atualizar(jog.x, jog.y); }
    if (!this.fim) this.diretor.atualizar(dt);
    this.horda.atualizar(dt);
    this.armas.atualizar(dt, this.entrada);
    this.projeteis.atualizar(dt);
    this.itens.atualizar(dt);
    this.efeitos.atualizar(dt);

    this.tremor *= Math.exp(-7 * dt);
    this.luz *= Math.exp(-16 * dt);
    this.flashDano.alpha *= Math.exp(-5 * dt);
    this.flashItem.alpha *= Math.exp(-7 * dt);
    this.veuBerserk.alpha = jog.tBerserk > 0 ? (jog.tBerserk < 3 && ((jog.tBerserk * 6) & 1) ? 0.04 : 0.16) : 0;
    return true;
  }

  desenhar(dt) {
    const jog = this.jogador, rc = this.rc, armas = this.armas;

    rc.limpar();
    this.horda.desenhar(rc);
    this.projeteis.desenhar(rc);
    this.itens.desenhar(rc);
    this.efeitos.desenhar(rc);

    // câmera: balança ao andar, treme com impactos e "cai" quando o jogador morre
    const alvoOlho = jog.morto ? 0.16 : ALTURA_OLHO + Math.sin(jog.balanco * 2) * 0.018 * jog.andando;
    this.olho += (alvoOlho - this.olho) * (jog.morto ? 1 - Math.exp(-3 * dt) : 1);
    const tx = (Math.random() - 0.5) * this.tremor, ty = (Math.random() - 0.5) * this.tremor;
    rc.luzExtra = this.luz;
    rc.invertido = jog.tInvul > 0 && (jog.tInvul > 2.5 || ((jog.tInvul * 6) & 1) === 0); // pisca quando está acabando
    rc.desenhar({ x: jog.x, y: jog.y, ang: jog.ang, olho: this.olho, deslocY: ty });
    this.efeitos.desenharNumeros(rc);
    this.desenharRadar();

    // copia o buffer para a textura (no WebGL, refresh() reenvia a imagem para a placa de vídeo)
    this.texVista.context.putImageData(rc.imagem, 0, 0);
    this.texVista.refresh();
    this.imgVista.x = Math.round(tx) * ESCALA;

    // arma: balanço em "U" ao andar, recuo ao atirar, abaixa ao trocar
    const fase = jog.balanco;
    const bx = Math.sin(fase) * 5 * jog.andando;
    const by = Math.abs(Math.cos(fase)) * 4 * jog.andando;
    // cada arma pode vir de um atlas diferente e ter escala/posição próprias (ver `vista` em data/armas.js)
    const vista = armas.def.vista, frameArma = armas.quadroArma;
    if (this.imgArma.frame.name !== frameArma) this.imgArma.setTexture(atlasDe(frameArma), frameArma);
    this.imgArma.setScale(vista.escala || ESCALA);
    // `origem` é o ponto do frame que fica preso na tela e em torno do qual a arma gira
    // (padrão: meio da base, como as armas do Doom); `rotacao` vem em graus
    const origem = vista.origem || [0.5, 1];
    this.imgArma.setOrigin(origem[0], origem[1]);
    this.imgArma.setAngle(vista.rotacao || 0);
    this.imgArma.x = TELA_L / 2 + (vista.x || 0) + Math.round(bx + armas.dxArma) * ESCALA;
    this.imgArma.y = BASE_ARMA + (vista.y || 0) + Math.round(by + armas.recuo + armas.abaixada * 90 + (jog.morto ? (ALTURA_OLHO - this.olho) * 260 : 0)) * ESCALA;
    const clarao = armas.quadroClarao;
    this.imgClarao.setVisible(!!clarao);
    if (clarao) {
      this.imgClarao.setFrame(clarao);
      this.imgClarao.x = this.imgArma.x - armas.dxArma * ESCALA;
      this.imgClarao.y = this.imgArma.y - this.imgArma.displayHeight + armas.def.vista.claraoDy * ESCALA;
    }
  }

  desenharRadar() {
    const rc = this.rc, { x, y, raio, alcance } = RADAR;
    rc.radarFundo(x, y, raio);
    for (const it of this.itens.pool.ativos) {
      if (it.def.efeito !== 'xp') rc.radarPonto(x, y, raio, alcance, it.x, it.y, 0xff40ff40, 2);
    }
    for (const e of this.horda.pool.ativos) {
      if (e.vivo) rc.radarPonto(x, y, raio, alcance, e.x, e.y, e.def.corRadar, e.def.radarGrande ? 3 : 1);
    }
  }

  // ============================================= serviços usados pelos sistemas

  tremer(forca) { this.tremor = Math.min(14, Math.max(this.tremor, forca)); }
  clarao(luz) { this.luz = Math.max(this.luz, luz); }
  mensagem(texto) { this.events.emit('mensagem', texto); }
  anunciar(titulo, subtitulo = '') { this.events.emit('anuncio', titulo, subtitulo); }
  atrairTodoXp() { this.itens.atrairTodoXp(); }

  /**
   * Toca um som "no mundo": o volume cai com a distância até o jogador e o pan
   * estéreo segue o lado de onde ele vem. Em primeira pessoa isso ajuda a
   * perceber, só pelo ouvido, o que está chegando pelas costas.
   */
  somEm(nome, x, y, volume = 1, intervaloMin = 0.04) {
    if (!nome) return;
    const jog = this.jogador;
    const dx = x - jog.x, dy = y - jog.y, d = Math.hypot(dx, dy);
    const ganho = Math.max(0.12, Math.min(1, 1.15 - d / 18));
    // componente "para a direita" da direção do som, de -1 a 1
    const lado = d > 0.3 ? (-dx * Math.sin(jog.ang) + dy * Math.cos(jog.ang)) / d : 0;
    sons.tocar(nome, volume * ganho, intervaloMin, lado * 0.8);
  }

  /** Explosão do jogador (Raio Explosivo, Solo Final): dano em área nos inimigos e, se estiver perto, em você. */
  explosao(x, y, def, dano, critico) {
    const jog = this.jogador;
    const raio = def.raio * jog.mods.area;
    this.horda.danoEmArea(x, y, raio, dano, def.empurrao, null, critico);
    this.efeitos.anim(def.quadros, x, y, 0.7, def.escala * Math.sqrt(jog.mods.area), 11);
    this.somEm(def.som, x, y, 1.2, 0.06);
    const d = Math.hypot(jog.x - x, jog.y - y);
    this.tremer(Math.max(1, 9 - d));
    this.clarao(80);
    if (def.feridaPropria && d < raio) jog.ferir(dano * def.feridaPropria * (1 - d / raio), x, y, 'Sua própria explosão');
  }

  /** Solo Final: cai um raio em cada inimigo que o jogador enxerga, com uma fração do dano. */
  rajadaDeRaios(arma, dano) {
    const jog = this.jogador, def = arma.tracos;
    for (const e of [...this.horda.pool.ativos]) {
      if (!e.vivo || Math.hypot(e.x - jog.x, e.y - jog.y) > def.alcance) continue;
      if (!this.mapa.visivel(jog.x, jog.y, e.x, e.y)) continue;
      this.armas.raio(arma.raio, e.x, e.y, e.def.voa || 0.6);
      ferirInimigo(e, dano * def.fracao, this, false, jog.x, jog.y, 2);
    }
  }

  // ---------------------------------------------------------------- reações

  aoAtirar() { this.events.emit('atirou'); }

  aoFerirJogador(dano, ox, oy) {
    const jog = this.jogador;
    this.flashDano.alpha = Math.min(0.6, 0.22 + dano * 0.012);
    this.tremer(3 + dano * 0.2);
    sons.tocar('ferido', 1, 0.1);
    // ângulo de onde veio o golpe, relativo a para onde o jogador olha (o HUD mostra a seta)
    const rel = Phaser.Math.Angle.Wrap(Math.atan2(oy - jog.y, ox - jog.x) - jog.ang);
    this.events.emit('ferido', rel, dano);
  }

  aoMorrerJogador() {
    this.fim = 'derrota';
    this.tFim = 2.6;
    this.entrada.soltarTudo();
    sons.tocar('morte');
    this.flashDano.alpha = 0.7;
  }

  aoColetarItem(def) {
    this.flashItem.alpha = 0.22;
    this.events.emit('sorriso');
    if (def.msg) this.mensagem(def.msg);
  }

  aoNascerChefe() {
    this.anunciar('EDDIE 80', 'Derrote o chefão!');
    this.tremer(10);
    sons.tocar('chefeRugido');
  }

  aoEnfurecerChefe() {
    this.anunciar('FÚRIA!', 'O chefão está mais rápido e agressivo');
    this.tremer(12);
    sons.tocar('chefeFuria');
  }

  aoMorrerChefe(chefe) {
    this.fim = 'vitoria';
    this.tFim = 4.2;
    this.tFogos = 0;
    this.chefeMorto = chefe;
    this.jogador.tInvencivel = 99; // nada de morrer durante a comemoração
    this.horda.matarTodos(chefe);
    for (const p of this.projeteis.pool.ativos) if (!p.amigo) this.projeteis.pool.soltar(p);
    this.itens.atrairTodoXp();
    this.anunciar('CHEFÃO DERROTADO', '');
    this.tremer(14);
    sons.tocar('explosao');
  }

  fogosDaVitoria(dt) {
    this.tFogos -= dt;
    if (this.tFogos > 0 || this.tFim < 1.2) return;
    this.tFogos = 0.16;
    const c = this.chefeMorto;
    this.efeitos.anim(EFEITOS.explosao, c.x + (Math.random() - 0.5) * 2.6, c.y + (Math.random() - 0.5) * 2.6, 0.4 + Math.random() * 1.4, 1 + Math.random(), 12);
    sons.tocar('explosao', 0.7, 0.1);
    this.tremer(5);
  }

  // ------------------------------------------------------ telas sobrepostas

  abrirCartas() {
    this.sobrepor();
    sons.tocar('nivel');
    this.scene.launch('Cartas', { jogo: this });
  }

  pausar() {
    if (this.sobreposta || this.fim || !this.scene.isActive()) return;
    this.sobrepor();
    this.scene.launch('Pausa', { jogo: this });
  }

  sobrepor() {
    this.sobreposta = true;
    this.entrada.soltarTudo();
    this.entrada.destravar();
    this.scene.pause();
  }

  /** Chamado pelas telas sobrepostas ao fechar. Deve ser chamado dentro de um clique/tecla, para poder travar o mouse. */
  retomar() {
    this.entrada.travar();
    this.scene.resume();
  }

  encerrar() {
    this.sobreposta = true;
    this.entrada.destravar();
    if (this.fim === 'vitoria') sons.tocar('vitoria');
    this.scene.stop('Hud');
    this.scene.start('Fim', { vitoria: this.fim === 'vitoria', stats: { ...this.stats, nivel: this.jogador.nivel } });
  }
}
