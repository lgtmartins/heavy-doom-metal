// Entrada do jogador: teclado pelo Phaser, mouse pela API nativa de "pointer lock".
//
// Pointer lock é o modo em que o navegador esconde o cursor e entrega só o
// DESLOCAMENTO do mouse (movementX) — é o que todo FPS de navegador usa para
// girar a câmera. O navegador só permite travar depois de um clique, e a tecla
// ESC sempre destrava (por isso a cena de jogo trata "destravou" como "pausar").
const CHAVE_SENS = 'heavy-doom-metal-sensibilidade';

export class Entrada {
  constructor(cena) {
    this.cena = cena;
    this.canvas = cena.game.canvas;
    this.teclas = cena.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,Q,E,SPACE');
    this.giroAcumulado = 0;
    this.atirando = false;
    this.suprema = false;      // botão direito: dispara a BFG
    this.sensibilidade = 1;
    try { this.sensibilidade = Number(localStorage.getItem(CHAVE_SENS)) || 1; } catch { /* usa o padrão */ }

    this.aoMover = (e) => { if (this.travado) this.giroAcumulado += e.movementX; };
    this.aoApertar = (e) => {
      if (!cena.scene.isActive()) return; // cena pausada (menu de pausa, level-up...): ignora
      if (!this.travado) this.travar();
      if (e.button === 0) this.atirando = true;
      if (e.button === 2) this.suprema = true;
    };
    this.aoSoltar = (e) => { if (e.button === 0) this.atirando = false; };
    this.semMenu = (e) => e.preventDefault();
    this.aoMudarTrava = () => cena.events.emit('trava', this.travado);

    document.addEventListener('mousemove', this.aoMover);
    this.canvas.addEventListener('mousedown', this.aoApertar);
    window.addEventListener('mouseup', this.aoSoltar);
    this.canvas.addEventListener('contextmenu', this.semMenu);
    document.addEventListener('pointerlockchange', this.aoMudarTrava);

    // Listeners nativos não morrem com a cena: se não forem removidos, a cada
    // "reiniciar" o jogo ganharia mais uma cópia deles.
    cena.events.once('shutdown', () => this.destruir());
  }

  get travado() { return document.pointerLockElement === this.canvas; }

  travar() {
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { /* o navegador recusou (ex.: logo após o ESC): tenta no próximo clique */ });
    } catch { /* idem */ }
  }

  destravar() { if (this.travado) document.exitPointerLock(); }

  ajustarSensibilidade(fator) {
    this.sensibilidade = Math.min(4, Math.max(0.25, this.sensibilidade * fator));
    try { localStorage.setItem(CHAVE_SENS, String(this.sensibilidade)); } catch { /* sem armazenamento */ }
    return this.sensibilidade;
  }

  /** Quanto o mouse girou desde a última chamada, em radianos. */
  consumirGiro() {
    const g = this.giroAcumulado * 0.0026 * this.sensibilidade;
    this.giroAcumulado = 0;
    return g;
  }

  soltarTudo() {
    this.atirando = false;
    this.suprema = false;
    this.giroAcumulado = 0;
  }

  destruir() {
    document.removeEventListener('mousemove', this.aoMover);
    this.canvas.removeEventListener('mousedown', this.aoApertar);
    window.removeEventListener('mouseup', this.aoSoltar);
    this.canvas.removeEventListener('contextmenu', this.semMenu);
    document.removeEventListener('pointerlockchange', this.aoMudarTrava);
  }
}
