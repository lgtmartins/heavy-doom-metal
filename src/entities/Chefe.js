// Chefão final: Eddie 80 (o slot do Spider Mastermind do jogo original).
//
// Ele é um inimigo comum para o resto do jogo (mesmo pool, leva dano igual); o
// que muda é a "ia": um ciclo de padrões de ataque com uma pausa andando entre
// eles. Abaixo de 50% de vida entra em FÚRIA: fica mais rápido, os padrões
// ficam mais densos e ganha a investida. Os números estão em data/chefe.js.
import { CHEFE } from '../data/chefe.js';
import { PROJETEIS_INIMIGOS, EFEITOS } from '../data/inimigos.js';
import { perseguir } from './Inimigo.js';
import { sons } from '../systems/Sons.js';

export function iniciarChefe(e) {
  e.chefe = { fase: 'andar', t: 0, tTiro: 0, feitos: 0, furia: false, ciclo: 0, tContato: 0, tParado: 0, refX: e.x, refY: e.y, tPasso: 0 };
  e.tAtaque = 2.2;
}

function terminar(e) {
  const c = e.chefe;
  c.fase = 'andar';
  e.estado = 'andar';
  e.tAtaque = CHEFE.pausaEntreAtaques[c.furia ? 1 : 0];
}

function comecar(e, fase) {
  const c = e.chefe;
  c.fase = fase; c.t = 0; c.tTiro = 0; c.feitos = 0;
  e.estado = 'atacar'; e.tEstado = 0;
}

function invocar(grupos, e, jogo) {
  for (const [tipo, qtd] of grupos) {
    for (let i = 0; i < qtd; i++) jogo.diretor.nascerEmVolta(tipo, e.x, e.y, 2.2, 5.5);
  }
  sons.tocar('teleporte');
}

function escolherPadrao(e, jogo) {
  const c = e.chefe;
  const padroes = c.furia ? ['rajada', 'investida', 'anel', 'invocar', 'rajada', 'anel'] : ['rajada', 'anel', 'invocar'];
  let p = padroes[c.ciclo++ % padroes.length];
  if (p === 'invocar' && jogo.horda.vivos > 45) p = 'anel'; // já tem gente demais na arena
  comecar(e, p);
  if (p === 'investida' || p === 'invocar') jogo.somEm('chefeRugido', e.x, e.y, 1, 0.3);
}

export function iaChefe(e, dt, jogo) {
  const c = e.chefe, j = jogo.jogador;
  const f = c.furia ? 1 : 0;
  const dx = j.x - e.x, dy = j.y - e.y, d = Math.hypot(dx, dy) || 0.001;

  // ---- entra em fúria na metade da vida
  if (!c.furia && e.vida <= e.vidaMax * CHEFE.fracaoFuria) {
    c.furia = true;
    e.tom = 1; // sprite avermelhado
    invocar(CHEFE.invocarAoEnfurecer, e, jogo);
    jogo.aoEnfurecerChefe(e);
    terminar(e);
    e.tAtaque = 1.4;
    return;
  }

  // ---- dano de contato (pisão)
  c.tContato -= dt;
  if (d < e.raio + j.raio + 0.3 && c.tContato <= 0) {
    c.tContato = CHEFE.contato.intervalo;
    j.ferir(CHEFE.contato.dano, e.x, e.y, e.def.nome);
  }

  c.t += dt;
  switch (c.fase) {
    case 'andar': {
      e.estado = 'andar';
      if (d > 3) {
        perseguir(e, dt, jogo, f ? CHEFE.velFuria : e.def.vel);
        // passos metálicos: dá para ouvir de que lado ele vem
        c.tPasso -= dt;
        if (c.tPasso <= 0) { c.tPasso = f ? 0.34 : 0.5; jogo.somEm('chefePasso', e.x, e.y); }
      }
      // anti-trava: se ficou 3 s praticamente parado longe do jogador, teleporta
      c.tParado += dt;
      if (c.tParado > 3) {
        if (Math.hypot(e.x - c.refX, e.y - c.refY) < 0.8 && d > 6) {
          const pos = jogo.diretor.posicaoDeNascimento(7, 10, 1.4);
          if (pos) {
            jogo.efeitos.anim(EFEITOS.teleporte, e.x, e.y, 1, 3, 10);
            e.x = pos.x; e.y = pos.y;
            jogo.efeitos.anim(EFEITOS.teleporte, e.x, e.y, 1, 3, 10);
            sons.tocar('teleporte');
          }
        }
        c.tParado = 0; c.refX = e.x; c.refY = e.y;
      }
      if (e.tAtaque <= 0) escolherPadrao(e, jogo);
      break;
    }

    // Padrão 1: rajada mirada, com um pouco de antecipação do movimento do jogador
    case 'rajada': {
      const r = CHEFE.rajada;
      c.tTiro -= dt;
      while (c.tTiro <= 0) {
        c.tTiro += r.intervalo[f];
        const tempoDeVoo = d / r.vel;
        const ang = Math.atan2(dy + j.vy * tempoDeVoo * 0.55, dx + j.vx * tempoDeVoo * 0.55) + (Math.random() * 2 - 1) * r.dispersao;
        jogo.projeteis.disparar(PROJETEIS_INIMIGOS[r.projetil], false, e.x + (dx / d) * e.raio, e.y + (dy / d) * e.raio, ang, r.vel, r.dano, false, e.def.nome);
        if ((c.feitos++ & 1) === 0) {
          jogo.efeitos.anim(PROJETEIS_INIMIGOS.bala.impacto, e.x + (dx / d) * (e.raio + 0.2), e.y + (dy / d) * (e.raio + 0.2), 0.75, 0.5, 20);
          jogo.somEm('chefeTiro', e.x, e.y, 1, 0.05);
        }
      }
      if (c.t >= r.duracao[f]) terminar(e);
      break;
    }

    // Padrão 2: anéis de orbes; cada anel sai girado em relação ao anterior, abrindo vãos diferentes
    case 'anel': {
      const a = CHEFE.anel;
      c.tTiro -= dt;
      if (c.tTiro <= 0 && c.feitos < a.aneis[f]) {
        c.tTiro = a.intervalo;
        const n = a.porAnel[f];
        const base = Math.atan2(dy, dx) + (c.feitos & 1 ? Math.PI / n : 0);
        const def = PROJETEIS_INIMIGOS[f ? a.projetilFuria : a.projetil];
        for (let i = 0; i < n; i++) jogo.projeteis.disparar(def, false, e.x, e.y, base + (i / n) * Math.PI * 2, a.vel[f], a.dano, false, e.def.nome);
        c.feitos++;
        jogo.somEm('tiroInimigo', e.x, e.y, 1.3, 0.1);
        jogo.tremer(2);
      }
      if (c.feitos >= a.aneis[f] && c.tTiro <= 0) terminar(e);
      break;
    }

    // Padrão 3: reforços
    case 'invocar': {
      if (c.t >= CHEFE.invocar.preparo) {
        invocar(CHEFE.invocar.grupos[f], e, jogo);
        terminar(e);
      }
      break;
    }

    // Padrão 4 (fúria): para, pisca e dispara em linha reta
    case 'investida': {
      const iv = CHEFE.investida;
      if (c.t < iv.preparo) {
        e.flash = 0.05;
        e.dirX = dx / d; e.dirY = dy / d;
      } else {
        const bateu = jogo.mapa.mover(e, e.dirX * iv.vel * dt, e.dirY * iv.vel * dt);
        if (d < e.raio + j.raio + 0.3 && j.ferir(iv.dano, e.x, e.y, e.def.nome)) jogo.tremer(8);
        if ((bateu && c.t > iv.preparo + 0.2) || c.t >= iv.preparo + iv.duracao) {
          if (bateu) jogo.tremer(6);
          terminar(e);
        }
      }
      break;
    }
    default: terminar(e);
  }
}
