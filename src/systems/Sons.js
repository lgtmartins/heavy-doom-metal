// Áudio do jogo, todo pela Web Audio API.
//
// Efeitos: são os WAVs originais do Doom (tabela em data/sons.js). A cena de boot
// baixa os arquivos; aqui eles são decodificados em AudioBuffers e tocados com
// volume, tom e posição estéreo (pan) por toque.
//
// Alguns sons não existem no pack e são sintetizados (RECEITAS, abaixo), com
// dois tijolos: tom() é um oscilador cuja frequência desliza; ruido() é ruído
// branco passando por um filtro. A música é outra coisa: fica em systems/Jukebox.js.
import { SONS } from '../data/sons.js';

// Os 5 raios coloridos tocam o choque elétrico de Assets/heavy/sons (ver data/sons.js).
const RECEITAS = {
  // Solo Final: a nota sobe durante a carga (0,55 s) e termina num acorde longo
  soloFinal: (s) => {
    s.tom('sawtooth', 110, 660, 0.55, 0.3);
    s.tom('square', 220, 1320, 0.55, 0.12);
    [82.4, 123.5, 164.8, 329.6].forEach(f => s.tom('sawtooth', f, f * 0.98, 0.9, 0.2, 0.55));
  },
  xp: (s) => { s.tom('triangle', 900, 1350, 0.05, 0.1); },
  dash: (s) => { s.ruido(0.16, 700, 3200, 0.35); },
  vitoria: (s) => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => s.tom('square', f, f, 0.22, 0.22, i * 0.14)); },
};

class Sons {
  constructor() {
    this.ctx = null;
    this.mudo = false;
    this.ultimo = {};        // nome -> instante do último toque (limita sons repetidos)
    this.volume = 1;         // volume dos efeitos (0..1), ajustado na tela de música
    this.aoMudar = null;     // avisado quando o som é ligado/desligado (a jukebox se cala junto)
    this.volumeDaVez = 1;
    this.brutos = {};        // nome do arquivo -> ArrayBuffer (WAV ainda não decodificado)
    this.amostras = {};      // nome do arquivo -> AudioBuffer pronto para tocar
    this.avisados = {};
  }

  /** Recebe os WAVs baixados pela cena de boot: { 'pistol': ArrayBuffer, ... }. */
  registrar(brutos) {
    this.brutos = brutos;
    if (this.ctx) this.decodificar();
  }

  /** Decodificar exige o AudioContext, que só existe depois do primeiro clique/tecla. */
  decodificar() {
    for (const [arquivo, dados] of Object.entries(this.brutos)) {
      // slice(0): decodeAudioData "consome" o buffer que recebe, então entregamos uma cópia
      this.ctx.decodeAudioData(dados.slice(0)).then((buf) => { this.amostras[arquivo] = buf; })
        .catch(() => console.warn(`Não foi possível decodificar o som "${arquivo}"`));
    }
    this.brutos = {};
  }

  /** Navegadores só liberam áudio depois de um gesto do usuário: chame isto num clique/tecla. */
  iniciar() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.mestre = this.ctx.createGain();
      this.mestre.gain.value = this.ganhoMestre();
      const comp = this.ctx.createDynamicsCompressor(); // segura o volume quando muita coisa toca junto
      this.mestre.connect(comp).connect(this.ctx.destination);
      const n = this.ctx.sampleRate;
      this.bufRuido = this.ctx.createBuffer(1, n, n);
      const d = this.bufRuido.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.decodificar();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  ganhoMestre() { return this.mudo ? 0 : 0.5 * this.volume; }

  alternarMudo() {
    this.mudo = !this.mudo;
    if (this.mestre) this.mestre.gain.value = this.ganhoMestre();
    this.aoMudar?.();
    return this.mudo;
  }

  /** Volume dos efeitos, de 0 a 1. */
  definirVolume(v) {
    this.volume = v;
    if (this.mestre) this.mestre.gain.value = this.ganhoMestre();
  }

  /**
   * Toca um som pelo nome (chave de data/sons.js ou de RECEITAS).
   * @param intervaloMin  ignora o pedido se o mesmo som tocou há menos que isso (s): evita empilhar 30 mortes no mesmo quadro
   * @param pan           posição estéreo, de -1 (esquerda) a 1 (direita)
   */
  tocar(nome, volume = 1, intervaloMin = 0.04, pan = 0) {
    if (!this.ctx || this.mudo || this.ctx.state !== 'running') return;
    const agora = this.ctx.currentTime;
    if (agora - (this.ultimo[nome] || -1) < intervaloMin) return;
    this.ultimo[nome] = agora;
    const def = SONS[nome];
    if (def) { this.tocarAmostra(def, volume, pan); return; }
    if (RECEITAS[nome]) {
      this.volumeDaVez = volume;
      this.saida = this.mestre;
      RECEITAS[nome](this);
    } else if (!this.avisados[nome]) {
      this.avisados[nome] = true;
      console.warn(`Som desconhecido: "${nome}"`);
    }
  }

  tocarAmostra(def, volume, pan) {
    const arquivos = def.arquivo;
    const arquivo = Array.isArray(arquivos) ? arquivos[(Math.random() * arquivos.length) | 0] : arquivos;
    const buf = this.amostras[arquivo];
    if (!buf) return; // ainda decodificando (primeiros instantes depois do primeiro clique)
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = (def.tom || 1) * (1 + (Math.random() * 2 - 1) * (def.variacao || 0));
    const v = (def.volume ?? 1) * volume, t = this.ctx.currentTime;
    g.gain.setValueAtTime(v, t);
    if (def.duracao) {
      // corta o som em `duracao` s: segura o volume até 70% do tempo e some no resto
      g.gain.setValueAtTime(v, t + def.duracao * 0.7);
      g.gain.linearRampToValueAtTime(0, t + def.duracao);
    }
    let saida = src.connect(g);
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      saida = saida.connect(p);
    }
    saida.connect(this.mestre);
    src.start(t, def.inicio || 0);
    if (def.duracao) src.stop(t + def.duracao + 0.02);
  }

  tom(tipo, f0, f1, dur, ganho, atraso = 0) {
    const t = this.ctx.currentTime + atraso;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(ganho * this.volumeDaVez, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.saida);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  ruido(dur, f0, f1, ganho, atraso = 0, tipo = 'lowpass') {
    const t = this.ctx.currentTime + atraso;
    const src = this.ctx.createBufferSource(), filtro = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.bufRuido;
    filtro.type = tipo;
    filtro.frequency.setValueAtTime(f0, t);
    filtro.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(ganho * this.volumeDaVez, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filtro).connect(g).connect(this.saida);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

}

// Uma única instância para o jogo todo (as cenas importam `sons`).
export const sons = new Sons();
