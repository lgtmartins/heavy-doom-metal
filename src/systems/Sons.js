// Áudio do jogo, todo pela Web Audio API.
//
// Efeitos: são os WAVs originais do Doom (tabela em data/sons.js). A cena de boot
// baixa os arquivos; aqui eles são decodificados em AudioBuffers e tocados com
// volume, tom e posição estéreo (pan) por toque.
//
// Alguns sons não existem no pack e são sintetizados (RECEITAS, abaixo), com
// dois tijolos: tom() é um oscilador cuja frequência desliza; ruido() é ruído
// branco passando por um filtro. A música também é sintetizada: um sequenciador
// de 16 passos (baixo distorcido + bumbo + chimbal).
import { SONS } from '../data/sons.js';

/**
 * O som de um raio da guitarra: um "power chord" (a nota, a quinta e a oitava, em onda
 * dente de serra) com um estalo elétrico agudo por cima.
 *   nota   frequência da nota mais grave, em Hz (82 = Mi grave da guitarra)
 *   dur    duração do acorde, em s;  ganho = volume
 */
function acorde(s, nota, dur, ganho) {
  s.tom('sawtooth', nota, nota * 0.97, dur, ganho);
  s.tom('sawtooth', nota * 1.5, nota * 1.46, dur, ganho * 0.7);
  s.tom('square', nota * 2, nota * 1.94, dur * 0.8, ganho * 0.35);
  s.tom('sawtooth', 2600, 500, 0.07, ganho * 0.45);
  s.ruido(0.07, 6000, 1500, ganho * 0.6);
}

const RECEITAS = {
  // Um som por raio: quanto mais pesado o raio, mais grave e longo o acorde.
  raioAzul: (s) => acorde(s, 164.8, 0.2, 0.22),
  raioVerde: (s) => { acorde(s, 110, 0.4, 0.3); s.ruido(0.3, 2500, 300, 0.35); },   // leque: grave, com um "chiado" largo
  raioAmarelo: (s) => acorde(s, 220, 0.07, 0.14),                                   // contínuo: palhetadas curtas e agudas
  raioVermelho: (s) => { acorde(s, 82.4, 0.5, 0.34); s.tom('sine', 60, 35, 0.4, 0.4); }, // explosivo: o mais grave
  raioRoxo: (s) => acorde(s, 196, 0.08, 0.17),                                      // tempestade
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

// Riff original em mi menor (semitons acima do Mi1; -1 = pausa), 16 passos por compasso.
const RIFF = [
  [0, 0, 12, 0, 0, 10, 0, 0, 8, 0, 0, 7, 0, 3, 5, 7],
  [0, 0, 12, 0, 0, 10, 0, 0, 8, 0, 0, 7, 6, 5, 3, 1],
  [3, 3, 15, 3, 3, 13, 3, 3, 12, 3, 3, 10, 3, 7, 8, 10],
  [0, 0, 12, 0, 0, 10, 0, 0, 8, 0, 7, 0, 6, 0, 5, 3],
];

class Sons {
  constructor() {
    this.ctx = null;
    this.mudo = false;
    this.ultimo = {};        // nome -> instante do último toque (limita sons repetidos)
    this.musicaLigada = false;
    this.intensa = false;    // versão acelerada para o chefão
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
      this.mestre.gain.value = 0.5;
      const comp = this.ctx.createDynamicsCompressor(); // segura o volume quando muita coisa toca junto
      this.mestre.connect(comp).connect(this.ctx.destination);
      this.canalMusica = this.ctx.createGain();
      this.canalMusica.gain.value = 0.16;
      this.canalMusica.connect(this.mestre);
      const n = this.ctx.sampleRate;
      this.bufRuido = this.ctx.createBuffer(1, n, n);
      const d = this.bufRuido.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.curva = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; this.curva[i] = Math.tanh(x * 5); }
      this.decodificar();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  alternarMudo() {
    this.mudo = !this.mudo;
    if (this.mestre) this.mestre.gain.value = this.mudo ? 0 : 0.5;
    return this.mudo;
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
    g.gain.value = (def.volume ?? 1) * volume;
    let saida = src.connect(g);
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      saida = saida.connect(p);
    }
    saida.connect(this.mestre);
    src.start();
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

  // ----------------------------------------------------------------- música

  musica(ligar, intensa = false) {
    this.intensa = intensa;
    if (ligar === this.musicaLigada) return;
    this.musicaLigada = ligar;
    clearInterval(this.relogio);
    if (!ligar || !this.ctx) return;
    this.passo = 0;
    this.proximo = this.ctx.currentTime + 0.1;
    // Agenda as notas um pouco adiantado; setInterval sozinho não tem precisão para ritmo.
    this.relogio = setInterval(() => this.agendar(), 50);
  }

  agendar() {
    if (!this.ctx || this.ctx.state !== 'running') { if (this.ctx) this.proximo = this.ctx.currentTime + 0.1; return; }
    const dur = 60 / (this.intensa ? 172 : 140) / 4; // duração de uma semicolcheia
    while (this.proximo < this.ctx.currentTime + 0.15) {
      const p = this.passo % 16, compasso = Math.floor(this.passo / 16) % RIFF.length;
      const semitom = RIFF[compasso][p] + (this.intensa ? 2 : 0);
      this.nota(41.2 * 2 ** (semitom / 12), this.proximo, dur * 0.9);
      if (p % 4 === 0 || (this.intensa && p % 4 === 2)) this.bumbo(this.proximo);
      if (p % 2 === 0) this.chimbal(this.proximo, p % 8 === 4 ? 0.5 : 0.22);
      this.proximo += dur;
      this.passo++;
    }
  }

  nota(freq, t, dur) {
    const osc = this.ctx.createOscillator(), dist = this.ctx.createWaveShaper(), filtro = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq * 2;
    dist.curve = this.curva;
    filtro.type = 'lowpass';
    filtro.frequency.value = 1100;
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + dur);
    osc.connect(dist).connect(filtro).connect(g).connect(this.canalMusica);
    osc.start(t);
    osc.stop(t + dur);
  }

  bumbo(t) {
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(1.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g).connect(this.canalMusica);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  chimbal(t, ganho) {
    const src = this.ctx.createBufferSource(), filtro = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.bufRuido;
    filtro.type = 'highpass';
    filtro.frequency.value = 6000;
    g.gain.setValueAtTime(ganho, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(filtro).connect(g).connect(this.canalMusica);
    src.start(t);
    src.stop(t + 0.06);
  }
}

// Uma única instância para o jogo todo (as cenas importam `sons`).
export const sons = new Sons();
