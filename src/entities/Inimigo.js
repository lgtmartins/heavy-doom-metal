// Inimigos: estado, inteligência (uma função por tipo de `ia`), dano e desenho.
//
// Um inimigo é um objeto simples (não um GameObject do Phaser), porque quem o
// desenha é o raycaster. Cada um é uma pequena máquina de estados:
//   nascer -> andar <-> atacar / preparar / investida / pavio / dor -> morrer
import { INIMIGOS, PROJETEIS_INIMIGOS, EFEITOS } from '../data/inimigos.js';
import { quadrosDe } from '../render/BancoDeSprites.js';
import { PX_POR_UNIDADE } from '../config.js';
import { iaChefe, iniciarChefe } from './Chefe.js';

const T_NASCER = 0.45;
const T_DOR = 0.2;

export function novoInimigo() {
  return {
    ativo: false, vivo: false, def: null, tipo: '', x: 0, y: 0, z: 0, raio: 0.3,
    vida: 0, vidaMax: 0, estado: 'nascer', tEstado: 0, tAnim: 0, tAtaque: 0, flash: 0,
    ex: 0, ey: 0,           // velocidade de empurrão (knockback)
    dirX: 0, dirY: 0,       // direção travada (investida)
    lado: 1, tLado: 0,      // para que lado o atirador anda
    atirou: false, tom: 0, chefe: null, idx: 0,
  };
}

export function iniciarInimigo(e, tipo, x, y, jogo) {
  const def = INIMIGOS[tipo];
  e.def = def; e.tipo = tipo; e.x = x; e.y = y; e.z = def.voa || 0; e.raio = def.raio;
  e.vidaMax = def.vida * (def.chefe ? 1 : jogo.diretor.multVida);
  e.vida = e.vidaMax;
  e.vivo = true;
  e.estado = 'nascer'; e.tEstado = 0; e.tAnim = Math.random(); e.flash = 0;
  e.tAtaque = 0.6 + Math.random() * 1.2;
  e.ex = e.ey = 0; e.lado = Math.random() < 0.5 ? -1 : 1; e.tLado = 1 + Math.random() * 2;
  e.atirou = false; e.tom = 0; e.chefe = null;
  if (def.chefe) iniciarChefe(e, jogo);
}

// ------------------------------------------------------------- movimento

/** Anda em direção ao jogador: em linha reta se o vê, senão pelo campo de fluxo. Devolve a distância. */
export function perseguir(e, dt, jogo, vel) {
  const j = jogo.jogador;
  const dx = j.x - e.x, dy = j.y - e.y;
  const d = Math.hypot(dx, dy) || 0.001;
  let ux = dx / d, uy = dy / d;
  if (d > 1.5 && !jogo.mapa.visivel(e.x, e.y, j.x, j.y)) {
    const dir = jogo.campo.direcao(e.x, e.y);
    if (dir.x || dir.y) { ux = dir.x; uy = dir.y; }
  }
  if (jogo.mapa.mover(e, ux * vel * dt, uy * vel * dt) && e.raio > 0.4) {
    // inimigo grande agarrado numa quina: o campo de fluxo o tira dali
    const dir = jogo.campo.direcao(e.x, e.y);
    jogo.mapa.mover(e, dir.x * vel * dt, dir.y * vel * dt);
  }
  return d;
}

function morder(e, d, jogo) {
  const a = e.def.ataque, j = jogo.jogador;
  if (d < e.raio + j.raio + a.alcance && e.tAtaque <= 0) {
    e.tAtaque = a.intervalo;
    j.ferir(a.dano * jogo.diretor.multDano, e.x, e.y, e.def.nome);
  }
}

function atirar(e, jogo) {
  const t = e.def.tiro, j = jogo.jogador;
  const ang = Math.atan2(j.y - e.y, j.x - e.x);
  const n = t.quantidade || 1;
  for (let i = 0; i < n; i++) {
    jogo.projeteis.disparar(PROJETEIS_INIMIGOS[t.projetil], false, e.x, e.y, ang + (i - (n - 1) / 2) * (t.leque || 0), t.vel, t.dano * jogo.diretor.multDano, false, e.def.nome);
  }
  jogo.somEm('tiroInimigo', e.x, e.y, 1, 0.08);
}

// ----------------------------------------------------- inteligências (ia)

const IA = {
  /** Blob: corre até o jogador e morde. */
  perseguidor(e, dt, jogo) {
    morder(e, perseguir(e, dt, jogo, e.def.vel), jogo);
  },

  /** Lost Soul: chega perto, para, e se lança em linha reta. */
  investida(e, dt, jogo) {
    const inv = e.def.investida, j = jogo.jogador;
    if (e.estado === 'andar') {
      const d = perseguir(e, dt, jogo, e.def.vel);
      if (d < inv.alcance && e.tAtaque <= 0 && jogo.mapa.visivel(e.x, e.y, j.x, j.y)) {
        e.estado = 'preparar'; e.tEstado = 0;
        jogo.somEm(e.def.sons.ataque, e.x, e.y, 1, 0.15);
      }
    } else if (e.estado === 'preparar') {
      if (e.tEstado >= inv.preparo) {
        const d = Math.hypot(j.x - e.x, j.y - e.y) || 1;
        e.dirX = (j.x - e.x) / d; e.dirY = (j.y - e.y) / d;
        e.estado = 'investida'; e.tEstado = 0;
      }
    } else if (e.estado === 'investida') {
      const bateu = jogo.mapa.mover(e, e.dirX * inv.vel * dt, e.dirY * inv.vel * dt);
      const acertou = Math.hypot(j.x - e.x, j.y - e.y) < e.raio + j.raio + 0.15;
      if (acertou) j.ferir(inv.dano * jogo.diretor.multDano, e.x, e.y, e.def.nome);
      if (bateu || acertou || e.tEstado > inv.duracao) { e.estado = 'andar'; e.tAtaque = inv.intervalo; }
    }
  },

  /** Banshee: corre até encostar, acende o pavio e explode. */
  kamikaze(e, dt, jogo) {
    const ex = e.def.explosao;
    if (e.estado === 'andar') {
      if (perseguir(e, dt, jogo, e.def.vel) < ex.gatilho) {
        e.estado = 'pavio'; e.tEstado = 0;
        jogo.somEm(e.def.sons.ataque, e.x, e.y, 1, 0.1);
      }
    } else if (e.estado === 'pavio') {
      perseguir(e, dt, jogo, e.def.vel * 0.55);
      if (e.tEstado >= ex.pavio) {
        const j = jogo.jogador, d = Math.hypot(j.x - e.x, j.y - e.y);
        if (d < ex.raio) j.ferir(ex.dano * jogo.diretor.multDano * (1 - (d / ex.raio) * 0.5), e.x, e.y, e.def.nome);
        jogo.tremer(5);
        matarInimigo(e, jogo, true); // explodiu sozinha: não rende XP
      }
    }
  },

  /** Ghoul: mantém distância, anda de lado e atira. */
  atirador(e, dt, jogo) {
    const t = e.def.tiro, j = jogo.jogador;
    if (e.estado === 'atacar') {
      if (!e.atirou && e.tEstado >= t.preparo) { e.atirou = true; atirar(e, jogo); }
      if (e.tEstado >= t.preparo + 0.25) { e.estado = 'andar'; e.tAtaque = t.intervalo * (0.8 + Math.random() * 0.4); }
      return;
    }
    const dx = j.x - e.x, dy = j.y - e.y, d = Math.hypot(dx, dy) || 0.001;
    const ve = jogo.mapa.visivel(e.x, e.y, j.x, j.y);
    if (!ve || d > t.distMax) {
      perseguir(e, dt, jogo, e.def.vel);
    } else {
      // anda de lado; se estiver perto demais, também recua
      e.tLado -= dt;
      const recuo = d < t.distMin ? -1 : 0;
      const mx = (dx / d) * recuo - (dy / d) * e.lado, my = (dy / d) * recuo + (dx / d) * e.lado;
      const bateu = jogo.mapa.mover(e, mx * e.def.vel * 0.7 * dt, my * e.def.vel * 0.7 * dt);
      if (bateu || e.tLado <= 0) { e.lado = -e.lado; e.tLado = 1 + Math.random() * 2.5; }
      if (e.tAtaque <= 0) { e.estado = 'atacar'; e.tEstado = 0; e.atirou = false; }
    }
  },

  /** Vassago: avança sempre; de longe lança bolas de fogo, de perto dá patada. */
  tanque(e, dt, jogo) {
    const t = e.def.tiro, j = jogo.jogador;
    if (e.estado === 'atacar') {
      if (!e.atirou && e.tEstado >= t.preparo) { e.atirou = true; atirar(e, jogo); }
      if (e.tEstado >= t.preparo + 0.3) { e.estado = 'andar'; e.tAtaque = Math.max(e.tAtaque, 0.5); e.tLado = t.intervalo * (0.8 + Math.random() * 0.4); }
      return;
    }
    const d = perseguir(e, dt, jogo, e.def.vel);
    morder(e, d, jogo);
    e.tLado -= dt; // aqui tLado é reaproveitado como recarga das bolas de fogo
    if (e.tLado <= 0 && d < t.distMax && d > 1.8 && jogo.mapa.visivel(e.x, e.y, j.x, j.y)) {
      e.estado = 'atacar'; e.tEstado = 0; e.atirou = false;
      jogo.somEm(e.def.sons.ataque, e.x, e.y, 1, 0.5);
    }
  },

  chefe: iaChefe,
};

// ---------------------------------------------------------- ciclo de vida

export function atualizarInimigo(e, dt, jogo) {
  e.tEstado += dt;
  e.tAnim += dt;
  if (e.flash > 0) e.flash -= dt;
  const def = e.def;

  if (e.estado === 'morrer') {
    const sp = def.sprites;
    // quem voa cai até o chão enquanto morre
    if (def.voa && sp.cadaver) e.z = Math.max(e.z - dt * 1.4, 0.3);
    if (e.tEstado >= sp.morrer.length / (sp.fpsMorrer || 9)) {
      if (sp.cadaver) jogo.efeitos.cadaver(sp.cadaver, e.x, e.y, def.escala, def.chefe ? 600 : 14);
      jogo.horda.pool.soltar(e);
    }
    return;
  }
  if (e.estado === 'nascer') {
    if (e.tEstado >= T_NASCER) e.estado = 'andar';
    return;
  }

  // empurrão dos tiros: decai rápido
  if (e.ex || e.ey) {
    jogo.mapa.mover(e, e.ex * dt, e.ey * dt);
    const k = Math.exp(-9 * dt);
    e.ex *= k; e.ey *= k;
    if (Math.abs(e.ex) + Math.abs(e.ey) < 0.05) e.ex = e.ey = 0;
  }
  if (e.estado === 'dor') {
    if (e.tEstado >= T_DOR) e.estado = 'andar';
    return;
  }
  e.tAtaque -= dt;
  IA[def.ia](e, dt, jogo);
}

/**
 * Aplica dano. (ox, oy) é de onde veio o tiro: define a direção do empurrão.
 * Devolve true se o inimigo morreu.
 */
export function ferirInimigo(e, dano, jogo, critico, ox, oy, empurrao = 0) {
  if (!e.vivo) return false;
  if (critico) dano *= 2;
  e.vida -= dano;
  e.flash = 0.09;
  jogo.stats.danoCausado += dano;
  jogo.efeitos.numero(e.x, e.y, (e.def.voa || 0.55) + 0.45, dano, critico);
  const mult = e.def.empurraoMult ?? 1;
  if (empurrao && mult) {
    const dx = e.x - ox, dy = e.y - oy, d = Math.hypot(dx, dy) || 1;
    e.ex += (dx / d) * empurrao * mult; e.ey += (dy / d) * empurrao * mult;
  }
  if (e.vida <= 0) {
    matarInimigo(e, jogo, false);
    return true;
  }
  if (e.def.chanceDor && Math.random() < e.def.chanceDor && (e.estado === 'andar' || e.estado === 'atacar' || e.estado === 'preparar')) {
    e.estado = 'dor'; e.tEstado = 0;
    jogo.somEm(e.def.sons?.dor || 'dorGenerica', e.x, e.y, 0.8, 0.12);
  }
  return false;
}

export function matarInimigo(e, jogo, semRecompensa) {
  if (!e.vivo) return;
  const def = e.def;
  e.vivo = false;
  e.estado = 'morrer'; e.tEstado = 0; e.flash = 0;
  jogo.horda.vivos -= 1;
  if (!semRecompensa) {
    jogo.stats.abates += 1;
    if (def.xp) jogo.itens.criar(def.xpGrande ? 'xpGrande' : 'xp', e.x, e.y, def.xp);
    jogo.itens.sortearDrop(e.x, e.y, def.ia === 'tanque');
  }
  // criaturas de fogo (sprites com `brilho`) não sangram
  if (!def.sprites.brilho) jogo.efeitos.sangue(e.x, e.y, (def.voa || 0.5), def.ia === 'tanque' ? 14 : 5);
  jogo.somEm(def.sons?.morte || 'gosma', e.x, e.y, 1, 0.06);
  if (def.explosao) jogo.somEm('explosao', e.x, e.y, 0.7, 0.08);
  // a Banshee explode ao morrer e leva os vizinhos junto (reação em cadeia!)
  if (def.explosao) {
    jogo.efeitos.anim(EFEITOS.explosao, e.x, e.y, e.z, 1.1, 12);
    jogo.horda.danoEmArea(e.x, e.y, def.explosao.raio, def.explosao.danoInimigos, 3, e);
  }
  if (def.chefe) jogo.aoMorrerChefe(e);
}

export function desenharInimigo(e, rc) {
  const def = e.def, sp = def.sprites;
  let lista, i;
  if (e.estado === 'morrer') {
    lista = quadrosDe(sp.morrer);
    i = Math.min(lista.length - 1, (e.tEstado * (sp.fpsMorrer || 9)) | 0);
  } else if (e.estado === 'nascer') {
    if (e.tEstado < T_NASCER * 0.5) return; // ainda escondido pela névoa de teleporte
    lista = quadrosDe(sp.andar); i = 0;
  } else if (e.estado === 'dor' && sp.dor) {
    lista = quadrosDe(sp.dor); i = 0;
  } else if ((e.estado === 'atacar' || e.estado === 'preparar' || e.estado === 'investida') && sp.atacar) {
    lista = quadrosDe(sp.atacar);
    i = ((e.tEstado * 9) | 0) % lista.length;
  } else {
    lista = quadrosDe(sp.andar);
    i = ((e.tAnim * sp.fps) | 0) % lista.length;
  }
  const q = lista[i];
  const morrendo = e.estado === 'morrer';
  // pavio da Banshee e chefão em fúria piscam
  const flash = e.flash > 0 || (e.estado === 'pavio' && ((e.tEstado * 14) & 1) === 1);
  const brilho = morrendo ? !!sp.morrerBrilho : !!sp.brilho;
  if (def.voa) {
    // quando o cadáver assenta no chão, garante que a base do sprite não afunde
    const zMin = (q.h * def.escala) / PX_POR_UNIDADE / 2;
    rc.sprite(q, e.x, e.y, Math.max(e.z, morrendo ? zMin : 0), def.escala, true, brilho, flash, false, e.tom);
  } else if (morrendo && sp.morrerBrilho && !sp.cadaver) {
    rc.sprite(q, e.x, e.y, 0.5, def.escala, true, true, false, false, 0); // explosão no lugar do corpo
  } else {
    rc.sprite(q, e.x, e.y, 0, def.escala, false, brilho, flash, false, e.tom);
  }
}
