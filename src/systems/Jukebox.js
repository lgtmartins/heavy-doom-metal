// A jukebox: as músicas de data/musicas.js, no estilo do Tony Hawk's Pro Skater.
//
// No menu toca sempre a mesma (MUSICA_DO_MENU), em loop. Na partida as músicas se sucedem
// sozinhas, em ordem aleatória ou em sequência, só entre as que estão marcadas na lista;
// a tela de música (pausa > MÚSICA) troca de faixa, liga/desliga e mexe nos volumes.
//
// As músicas são tocadas por um elemento <audio> (streaming): decodificar 18 MP3 inteiros
// em memória, como os efeitos, custaria centenas de MB. As preferências ficam no navegador.
import { MUSICAS, MUSICA_DO_MENU, musicaPorId } from '../data/musicas.js';
import { sons } from './Sons.js';

const CHAVE = 'heavyDoomMetal.musica';
const PADRAO = {
  volume: 6,          // volume da música, 0..10
  efeitos: 10,        // volume dos efeitos, 0..10
  ligada: true,
  aleatoria: true,    // false = em sequência, na ordem da lista
  fora: [],           // ids desmarcados na lista: não tocam sozinhos na partida
};
export const VOLUME_MAX = 10;

function carregar() {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch { return { ...PADRAO }; }
}

class Jukebox {
  constructor() {
    this.cfg = carregar();
    this.audio = null;
    this.atual = null;        // a faixa carregada (objeto de MUSICAS)
    this.modo = null;         // 'menu' | 'partida' | null (saindo do menu)
    this.fade = 1;            // multiplicador do fade-in/fade-out, 0..1
    this.versao = 0;          // sobe a cada faixa nova: o HUD usa para mostrar o nome
    this.historico = [];      // faixas anteriores, para o "voltar"
    this.saco = [];           // ordem aleatória: cada faixa toca uma vez antes de repetir
    this.esperandoGesto = false;
    sons.definirVolume(this.cfg.efeitos / VOLUME_MAX);
    sons.aoMudar = () => this.aplicarVolume(); // a tecla M silencia a música também
  }

  salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(this.cfg)); } catch { /* sem armazenamento */ }
  }

  // ------------------------------------------------------------ menu e partida

  /** Menu principal: a música do menu, em loop. Não reinicia se ela já estiver tocando. */
  menu() {
    const tocandoMenu = this.modo === 'menu' && this.atual?.id === MUSICA_DO_MENU;
    this.modo = 'menu';
    if (tocandoMenu) { this.surgir(400); return; }
    this.historico = [];
    this.trocarCom(musicaPorId(MUSICA_DO_MENU), 600);
  }

  /** Clicou em jogar: a música do menu some aos poucos. */
  sairDoMenu(ms) {
    this.modo = null;
    this.desvanecer(ms, () => this.audio?.pause());
  }

  /** Começo de cada partida: sorteia uma música, a menos que a partida anterior ainda esteja tocando uma. */
  partida() {
    if (this.modo === 'partida' && this.atual) return;
    this.modo = 'partida';
    this.proxima();
  }

  // ------------------------------------------------------------------ comandos

  /** A próxima música: sorteada (aleatória) ou a seguinte da lista, só entre as marcadas. */
  proxima() {
    const marcadas = MUSICAS.filter(m => !this.cfg.fora.includes(m.id));
    if (!marcadas.length) { this.audio?.pause(); return; }
    let prox;
    if (this.cfg.aleatoria) {
      this.saco = this.saco.filter(id => marcadas.some(m => m.id === id) && id !== this.atual?.id);
      if (!this.saco.length) this.saco = marcadas.map(m => m.id).filter(id => id !== this.atual?.id || marcadas.length === 1);
      prox = musicaPorId(this.saco.splice((Math.random() * this.saco.length) | 0, 1)[0]);
    } else {
      const i = MUSICAS.indexOf(this.atual);
      prox = MUSICAS.slice(i + 1).concat(MUSICAS.slice(0, i + 1)).find(m => marcadas.includes(m));
    }
    if (this.atual) this.historico.push(this.atual);
    this.tocar(prox, false);
  }

  /** Volta: reinicia a música se ela já passou dos 3 s; senão, a anterior. */
  anterior() {
    if (!this.atual) return;
    if (this.audio.currentTime > 3 || !this.historico.length) { this.audio.currentTime = 0; return; }
    this.tocar(this.historico.pop(), false);
  }

  /** Toca uma faixa agora, do começo. */
  tocar(faixa, guardar = true) {
    if (!faixa) return;
    if (guardar && this.atual && this.atual !== faixa) this.historico.push(this.atual);
    if (this.historico.length > 30) this.historico.shift();
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.addEventListener('ended', () => { if (this.modo === 'partida') this.proxima(); });
    }
    this.atual = faixa;
    this.versao++;
    this.audio.loop = this.modo === 'menu';
    this.audio.src = `assets/musica/${faixa.arquivo}.mp3`;
    this.parar();
    this.fade = 1;
    this.aplicarVolume();
    this.play();
  }

  /** Troca de faixa com um fade-out curto da que estava tocando. */
  trocarCom(faixa, ms) {
    if (!this.audio || this.audio.paused) { this.tocar(faixa); return; }
    this.desvanecer(ms, () => this.tocar(faixa));
  }

  alternarLigada() {
    this.cfg.ligada = !this.cfg.ligada;
    this.salvar();
    if (!this.cfg.ligada) this.audio?.pause();
    else if (this.atual) this.play();
    else if (this.modo === 'partida') this.proxima();
  }

  mudarVolume(d) {
    this.cfg.volume = Math.max(0, Math.min(VOLUME_MAX, this.cfg.volume + d));
    this.salvar();
    this.aplicarVolume();
  }

  mudarEfeitos(d) {
    this.cfg.efeitos = Math.max(0, Math.min(VOLUME_MAX, this.cfg.efeitos + d));
    this.salvar();
    sons.definirVolume(this.cfg.efeitos / VOLUME_MAX);
  }

  alternarAleatoria() {
    this.cfg.aleatoria = !this.cfg.aleatoria;
    this.saco = [];
    this.salvar();
  }

  /** Marca/desmarca uma faixa: as desmarcadas não tocam sozinhas (mas dá para escolhê-las na lista). */
  alternarNaLista(id) {
    const fora = this.cfg.fora;
    this.cfg.fora = fora.includes(id) ? fora.filter(f => f !== id) : [...fora, id];
    this.salvar();
  }

  estaNaLista(id) { return !this.cfg.fora.includes(id); }

  get tocando() { return !!this.audio && !this.audio.paused; }

  /** Posição e duração da faixa atual, em segundos (duração 0 enquanto carrega). */
  tempo() {
    const a = this.audio;
    return { atual: a ? a.currentTime : 0, total: a && isFinite(a.duration) ? a.duration : 0 };
  }

  // ------------------------------------------------------------------ internos

  play() {
    if (!this.cfg.ligada || !this.audio) return;
    const p = this.audio.play();
    // Navegadores bloqueiam som antes do primeiro clique/tecla: tenta de novo no primeiro gesto.
    if (p && p.catch) p.catch(() => this.esperarGesto());
  }

  esperarGesto() {
    if (this.esperandoGesto) return;
    this.esperandoGesto = true;
    const tentar = () => {
      window.removeEventListener('pointerdown', tentar, true);
      window.removeEventListener('keydown', tentar, true);
      this.esperandoGesto = false;
      if (this.modo) this.play();
    };
    window.addEventListener('pointerdown', tentar, true);
    window.addEventListener('keydown', tentar, true);
  }

  aplicarVolume() {
    if (!this.audio) return;
    // curva quadrática: os degraus de volume soam mais parelhos ao ouvido
    const v = (this.cfg.volume / VOLUME_MAX) ** 2;
    this.audio.volume = sons.mudo ? 0 : Math.max(0, Math.min(1, v * this.fade));
  }

  parar() { clearInterval(this.relogioFade); }

  desvanecer(ms, depois) { this.rampa(0, ms, depois); }

  surgir(ms) {
    if (this.audio && this.audio.paused && this.atual) this.play();
    this.rampa(1, ms);
  }

  /** Leva o fade até `alvo` em `ms`, em passos de 30 ms. */
  rampa(alvo, ms, depois) {
    this.parar();
    const passo = (alvo - this.fade) / Math.max(1, ms / 30);
    if (!passo) { this.aplicarVolume(); depois?.(); return; }
    this.relogioFade = setInterval(() => {
      this.fade += passo;
      const chegou = passo < 0 ? this.fade <= alvo : this.fade >= alvo;
      if (chegou) this.fade = alvo;
      this.aplicarVolume();
      if (chegou) { this.parar(); depois?.(); }
    }, 30);
  }
}

export const jukebox = new Jukebox();
