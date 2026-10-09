// Itens no chão: gemas de XP e os drops (medkit, armadura, power-ups).
import { Pool } from '../systems/Pool.js';
import { quadrosDe } from '../render/BancoDeSprites.js';
import { ITENS, DROPS } from '../data/itens.js';
import { JOGADOR } from './Jogador.js';

const VEL_ATRACAO = 11;

export class Itens {
  constructor(jogo) {
    this.jogo = jogo;
    this.pool = new Pool(() => ({ ativo: false, def: null, tipo: '', x: 0, y: 0, valor: 0, t: 0, atraido: false, quadros: null }), 420);
  }

  criar(tipo, x, y, valor = 0) {
    const def = ITENS[tipo];
    let it = this.pool.obter();
    if (!it) {
      // Pool cheio (tela coalhada de XP): em vez de perder o XP, soma numa gema que já existe.
      if (def.efeito === 'xp') {
        const outra = this.pool.ativos.find(o => o.def.efeito === 'xp');
        if (outra) outra.valor += valor;
      }
      return null;
    }
    it.def = def; it.tipo = tipo; it.quadros = quadrosDe(def.quadros);
    it.x = x; it.y = y; it.valor = valor; it.t = Math.random(); it.atraido = false;
    return it;
  }

  /** Sorteia o drop de um inimigo morto (além do XP). */
  sortearDrop(x, y, tanque) {
    const chance = (tanque ? DROPS.chanceTanque : DROPS.chance) * this.jogo.jogador.mods.sorte;
    if (Math.random() > chance) return;
    const pesos = Object.entries(DROPS.pesos);
    let r = Math.random() * pesos.reduce((s, [, p]) => s + p, 0);
    for (const [tipo, peso] of pesos) {
      if ((r -= peso) <= 0) { this.criar(tipo, x, y); return; }
    }
  }

  atrairTodoXp() {
    for (const it of this.pool.ativos) if (it.def.efeito === 'xp') it.atraido = true;
  }

  atualizar(dt) {
    const j = this.jogo.jogador;
    const raioColeta = JOGADOR.raioColeta * j.mods.coleta;
    for (const it of this.pool.ativos) {
      it.t += dt;
      if (it.def.vida && it.t > it.def.vida) { this.pool.soltar(it); continue; }
      const dx = j.x - it.x, dy = j.y - it.y;
      const d = Math.hypot(dx, dy);
      if (d < JOGADOR.raioPegar) {
        this.pool.soltar(it);
        j.coletar(it.def, it.valor);
        continue;
      }
      // XP voa até o jogador dentro do raio de coleta; os outros itens só bem de perto
      if (!it.atraido && d < (it.def.atraido ? raioColeta : 1.3)) it.atraido = true;
      if (it.atraido && d > 0.01) {
        const v = Math.min(d, (VEL_ATRACAO + it.t * 2) * dt);
        it.x += (dx / d) * v; it.y += (dy / d) * v;
      }
    }
    this.pool.limpar();
  }

  desenhar(rc) {
    for (const it of this.pool.ativos) {
      const def = it.def;
      // pisca nos últimos 5 segundos
      if (def.vida && def.vida - it.t < 5 && ((it.t * 8) & 1)) continue;
      const qs = it.quadros;
      const q = qs.length > 1 ? qs[((it.t * (def.fps || 6)) | 0) % qs.length] : qs[0];
      rc.sprite(q, it.x, it.y, 0.06 + Math.abs(Math.sin(it.t * 3)) * 0.08, def.escala, false, true);
    }
  }
}
