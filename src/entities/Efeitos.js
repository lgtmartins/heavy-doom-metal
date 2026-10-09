// Efeitos visuais: explosões, sangue, fumaça de tiro, cadáveres e chamas no chão.
// Todos saem do mesmo pool. A maioria é só enfeite; o único que afeta o jogo é a
// chama do Vassago, que tem o campo `perigo`.
import { Pool } from '../systems/Pool.js';
import { quadrosDe, quadro } from '../render/BancoDeSprites.js';
import { EFEITOS } from '../data/inimigos.js';

const GRAVIDADE = 9;
const MAX_NUMEROS = 48;

export class Efeitos {
  constructor(jogo) {
    this.jogo = jogo;
    this.pool = new Pool(() => ({
      ativo: false, quadros: null, fps: 12, t: 0, dur: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      grav: false, escala: 1, centro: true, brilho: true, tom: 0, laco: false, perigo: null, tPerigo: 0,
    }), 700);
    // números de dano: um array fixo reaproveitado em círculo
    this.numeros = Array.from({ length: MAX_NUMEROS }, () => ({ t: 0, x: 0, y: 0, z: 0, valor: 0, cor: 0, escala: 1 }));
    this.proxNumero = 0;
  }

  /** Animação que toca uma vez e some. */
  anim(nomes, x, y, z, escala = 1, fps = 12, brilho = true) {
    const e = this.pool.obter();
    if (!e) return null;
    e.quadros = quadrosDe(nomes);
    e.fps = fps; e.t = 0; e.dur = e.quadros.length / fps;
    e.x = x; e.y = y; e.z = z; e.vx = e.vy = e.vz = 0;
    e.grav = false; e.escala = escala; e.centro = true; e.brilho = brilho; e.tom = 0; e.laco = false; e.perigo = null;
    return e;
  }

  /** Respingos de sangue: pequenas partículas com gravidade. */
  sangue(x, y, z, quantidade) {
    const qs = quadrosDe(EFEITOS.sangue);
    for (let i = 0; i < quantidade; i++) {
      const e = this.pool.obter();
      if (!e) return;
      const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 2.2;
      e.quadros = qs; e.fps = 7; e.t = Math.random() * 0.1; e.dur = 0.9;
      e.x = x; e.y = y; e.z = z;
      e.vx = Math.cos(a) * v; e.vy = Math.sin(a) * v; e.vz = 1.5 + Math.random() * 3;
      e.grav = true; e.escala = 1.3; e.centro = true; e.brilho = false; e.tom = 0; e.laco = false; e.perigo = null;
    }
  }

  /** Cadáver: o último frame da morte fica no chão por um tempo, escurecido. */
  cadaver(nome, x, y, escala, duracao = 14) {
    const e = this.pool.obter();
    if (!e) return;
    e.quadros = [quadro(nome)];
    e.fps = 1; e.t = 0; e.dur = duracao;
    e.x = x; e.y = y; e.z = 0; e.vx = e.vy = e.vz = 0;
    e.grav = false; e.escala = escala; e.centro = false; e.brilho = false; e.tom = 2; e.laco = true; e.perigo = null;
  }

  /** Chama no chão que queima o jogador (def = PROJETEIS_INIMIGOS.fogo.chama). */
  chama(def, x, y, dano) {
    const e = this.pool.obter();
    if (!e) return;
    e.quadros = quadrosDe(def.quadros);
    e.fps = e.quadros.length / def.duracao; e.t = 0; e.dur = def.duracao;
    e.x = x; e.y = y; e.z = 0; e.vx = e.vy = e.vz = 0;
    e.grav = false; e.escala = 1.5; e.centro = false; e.brilho = true; e.tom = 0; e.laco = false;
    e.perigo = { raio: def.raio, dano, intervalo: def.intervalo };
    e.tPerigo = 0.25;
  }

  numero(x, y, z, valor, critico) {
    const n = this.numeros[this.proxNumero];
    this.proxNumero = (this.proxNumero + 1) % MAX_NUMEROS;
    n.t = 0.7; n.x = x; n.y = y; n.z = z; n.valor = valor;
    n.cor = critico ? 0xff30d0ff : 0xffffffff;
    n.escala = critico ? 2 : 1;
  }

  atualizar(dt) {
    const j = this.jogo.jogador;
    for (const e of this.pool.ativos) {
      e.t += dt;
      if (e.t >= e.dur) { this.pool.soltar(e); continue; }
      if (e.grav) {
        e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
        e.vz -= GRAVIDADE * dt;
        if (e.z < 0.03) { this.pool.soltar(e); continue; }
      }
      if (e.perigo) {
        e.tPerigo -= dt;
        if (e.tPerigo <= 0 && Math.hypot(j.x - e.x, j.y - e.y) < e.perigo.raio) {
          e.tPerigo = e.perigo.intervalo;
          j.ferir(e.perigo.dano, e.x, e.y, 'Chamas do Vassago');
        }
      }
    }
    this.pool.limpar();
    for (const n of this.numeros) if (n.t > 0) { n.t -= dt; n.z += dt * 0.9; }
  }

  desenhar(rc) {
    for (const e of this.pool.ativos) {
      const qs = e.quadros;
      let i = (e.t * e.fps) | 0;
      i = e.laco ? i % qs.length : Math.min(i, qs.length - 1);
      // cadáver pisca nos últimos 2 segundos antes de sumir
      if (e.tom === 2 && e.dur - e.t < 2 && ((e.t * 10) & 1)) continue;
      rc.sprite(qs[i], e.x, e.y, e.z, e.escala, e.centro, e.brilho, false, false, e.tom);
    }
  }

  /** Os números são desenhados por cima de tudo, depois do rc.desenhar(). */
  desenharNumeros(rc) {
    for (const n of this.numeros) if (n.t > 0) rc.numero(n.x, n.y, n.z, n.valor, n.cor, n.escala);
  }
}
