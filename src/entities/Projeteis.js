// Projéteis do jogador (foguete, plasma, BFG) e dos inimigos, todos no mesmo pool.
import { Pool } from '../systems/Pool.js';
import { quadrosDe } from '../render/BancoDeSprites.js';
import { ferirInimigo } from './Inimigo.js';

const ALTURA = 0.5;      // todos voam na altura do peito
const VIDA_MAX = 6;      // segundos; some se não acertar nada
const PASSO_MAX = 0.3;   // tamanho máximo de cada passo de colisão

export class Projeteis {
  constructor(jogo) {
    this.jogo = jogo;
    this.pool = new Pool(() => ({
      ativo: false, def: null, amigo: false, x: 0, y: 0, vx: 0, vy: 0, dano: 0, t: 0, critico: false, quadros: null, causa: '',
    }), 600);
  }

  /**
   * @param def    definição visual/colisão (data/armas.js -> projetil, ou data/inimigos.js -> PROJETEIS_INIMIGOS)
   * @param amigo  true = do jogador (acerta inimigos); false = acerta o jogador
   */
  disparar(def, amigo, x, y, ang, vel, dano, critico = false, causa = '') {
    const p = this.pool.obter();
    if (!p) return null;
    p.def = def; p.amigo = amigo; p.quadros = quadrosDe(def.quadros);
    p.x = x; p.y = y; p.vx = Math.cos(ang) * vel; p.vy = Math.sin(ang) * vel;
    p.dano = dano; p.t = 0; p.critico = critico; p.causa = causa;
    return p;
  }

  atualizar(dt) {
    const { jogo } = this;
    const { mapa, jogador, horda } = jogo;
    for (const p of this.pool.ativos) {
      p.t += dt;
      if (p.t > VIDA_MAX) { this.pool.soltar(p); continue; }
      // anda em passos curtos: um projétil rápido não pode "pular" um inimigo fino
      const dist = Math.hypot(p.vx, p.vy) * dt;
      const passos = Math.max(1, Math.ceil(dist / PASSO_MAX));
      const sx = (p.vx * dt) / passos, sy = (p.vy * dt) / passos;
      for (let i = 0; i < passos && p.ativo; i++) {
        p.x += sx; p.y += sy;
        if (mapa.solido(p.x, p.y)) {
          // recua um pouco para o efeito não nascer dentro da parede
          p.x -= sx; p.y -= sy;
          this.impacto(p, null);
        } else if (p.amigo) {
          const alvo = horda.primeiroEm(p.x, p.y, p.def.raio);
          if (alvo) this.impacto(p, alvo);
        } else if (Math.hypot(jogador.x - p.x, jogador.y - p.y) < p.def.raio + jogador.raio) {
          // o dash atravessa projéteis: só some se o dano realmente entrou
          if (jogador.ferir(p.dano, p.x - p.vx, p.y - p.vy, p.causa) || !jogador.intocavel) this.impacto(p, null);
        }
      }
    }
    this.pool.limpar();
  }

  impacto(p, alvo) {
    const { jogo } = this;
    const def = p.def;
    this.pool.soltar(p);
    if (def.explosao) {
      jogo.explosao(p.x, p.y, def.explosao, p.dano, p.critico);
      return;
    }
    if (alvo) ferirInimigo(alvo, p.dano, jogo, p.critico, p.x, p.y, 1);
    if (def.impacto) jogo.efeitos.anim(def.impacto, p.x, p.y, ALTURA, def.impactoEscala || 1, 14);
    if (!p.amigo) jogo.somEm('impacto', p.x, p.y, 0.8, 0.12);
    if (def.chama && !alvo) {
      jogo.efeitos.chama(def.chama, p.x, p.y, def.chama.dano * jogo.diretor.multDano);
      jogo.somEm('fogo', p.x, p.y, 1, 0.1);
    }
  }

  desenhar(rc) {
    for (const p of this.pool.ativos) {
      const qs = p.quadros;
      rc.sprite(qs[((p.t * p.def.fps) | 0) % qs.length], p.x, p.y, ALTURA, p.def.escala, true, true);
    }
  }
}
