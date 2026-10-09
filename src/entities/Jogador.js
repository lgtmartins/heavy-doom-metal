// O jogador (Doomguy): movimento, vida/armadura, dash, power-ups e progressão.
import Phaser from 'phaser';
import { INICIO_JOGADOR } from '../data/mapa.js';
import { xpParaNivel } from '../data/upgrades.js';
import { sons } from '../systems/Sons.js';

// Números de balanceamento do jogador.
export const JOGADOR = {
  vida: 100,
  armaduraMax: 200,
  absorcaoArmadura: 1 / 3,   // fração do dano que a armadura segura (armadura verde do Doom)
  vel: 4.7,                  // unidades por segundo
  aceleracao: 14,            // quão rápido chega na velocidade (maior = mais "seco")
  giroTeclado: 2.9,          // rad/s nas setas ou Q/E
  invencivelAposDano: 0.55,  // segundos de invencibilidade ao levar dano
  dash: { vel: 15, duracao: 0.17, recarga: 2.2 },
  raioColeta: 2.8,           // distância em que o XP começa a voar até você
  raioPegar: 0.75,
};

export class Jogador {
  constructor(jogo) {
    this.jogo = jogo;
    this.x = INICIO_JOGADOR.x;
    this.y = INICIO_JOGADOR.y;
    this.ang = INICIO_JOGADOR.ang;
    this.raio = 0.3;
    this.vx = 0;
    this.vy = 0;

    this.vida = JOGADOR.vida;
    this.vidaMax = JOGADOR.vida;
    this.armadura = 0;
    this.morto = false;

    this.tInvencivel = 0;
    this.tDash = 0;
    this.dashRecarga = 0;
    this.dashX = 0;
    this.dashY = 0;
    this.tBerserk = 0;
    this.tInvul = 0;
    this.balanco = 0;       // fase do balanço da arma/câmera ao andar
    this.andando = 0;       // 0..1, suavizado

    // Multiplicadores que as cartas de upgrade alteram (data/upgrades.js).
    this.mods = { dano: 1, cadencia: 1, vel: 1, coleta: 1, projeteis: 0, critico: 0.05, area: 1, perfuracao: 0, regen: 0, xp: 1, sorte: 1, dashRecarga: 1 };
    this.cartas = {};       // id da carta -> quantas vezes foi escolhida
    this.armas = { pistola: { nivel: 1 } };

    this.nivel = 1;
    this.xp = 0;
    this.xpProx = xpParaNivel(1);
    this.niveisPendentes = 0; // level-ups ainda não escolhidos (a cena abre a tela de cartas)
  }

  get multDano() { return this.mods.dano * (this.tBerserk > 0 ? 2 : 1); }
  get intocavel() { return this.tInvencivel > 0 || this.tDash > 0 || this.tInvul > 0; }

  atualizar(dt, entrada) {
    if (this.morto) return;
    const t = entrada.teclas;

    // ---- girar: mouse (com pointer lock) ou teclado
    this.ang += entrada.consumirGiro();
    const giro = (t.RIGHT.isDown || t.E.isDown ? 1 : 0) - (t.LEFT.isDown || t.Q.isDown ? 1 : 0);
    this.ang += giro * JOGADOR.giroTeclado * dt;

    // ---- andar: frente/trás e de lado (strafe), relativo a para onde se olha
    const cos = Math.cos(this.ang), sin = Math.sin(this.ang);
    let frente = (t.W.isDown || t.UP.isDown ? 1 : 0) - (t.S.isDown || t.DOWN.isDown ? 1 : 0);
    let lado = (t.D.isDown ? 1 : 0) - (t.A.isDown ? 1 : 0);
    const n = Math.hypot(frente, lado);
    if (n > 1) { frente /= n; lado /= n; } // andar na diagonal não pode ser mais rápido
    const vel = JOGADOR.vel * this.mods.vel;
    const alvoX = (cos * frente - sin * lado) * vel, alvoY = (sin * frente + cos * lado) * vel;
    // Aproxima a velocidade atual da desejada. A fórmula com exp() dá o mesmo
    // resultado em qualquer taxa de quadros (um "lerp" fixo dependeria do FPS).
    const k = 1 - Math.exp(-JOGADOR.aceleracao * dt);
    this.vx += (alvoX - this.vx) * k;
    this.vy += (alvoY - this.vy) * k;

    // ---- dash
    this.dashRecarga -= dt;
    if (Phaser.Input.Keyboard.JustDown(t.SPACE) && this.dashRecarga <= 0) {
      const dx = n > 0 ? alvoX / vel : cos, dy = n > 0 ? alvoY / vel : sin;
      this.dashX = dx; this.dashY = dy;
      this.tDash = JOGADOR.dash.duracao;
      this.dashRecarga = JOGADOR.dash.recarga * this.mods.dashRecarga;
      sons.tocar('dash');
    }
    let mx = this.vx, my = this.vy;
    if (this.tDash > 0) {
      this.tDash -= dt;
      mx = this.dashX * JOGADOR.dash.vel; my = this.dashY * JOGADOR.dash.vel;
      this.vx = this.dashX * vel; this.vy = this.dashY * vel;
    }
    // em passos pequenos, para um dash rápido nunca atravessar a quina de uma parede
    const passos = Math.max(1, Math.ceil((Math.hypot(mx, my) * dt) / 0.2));
    for (let i = 0; i < passos; i++) this.jogo.mapa.mover(this, (mx * dt) / passos, (my * dt) / passos);

    const rapidez = Math.hypot(this.vx, this.vy) / vel;
    this.andando += (Math.min(1, rapidez) - this.andando) * k;
    this.balanco += rapidez * dt * 9;

    // ---- temporizadores
    this.tInvencivel -= dt;
    if (this.tBerserk > 0) this.tBerserk -= dt;
    if (this.tInvul > 0) this.tInvul -= dt;
    if (this.mods.regen > 0 && this.vida < this.vidaMax) this.vida = Math.min(this.vidaMax, this.vida + this.mods.regen * dt);
  }

  /** Aplica dano vindo de (ox, oy). `causa` é o nome de quem bateu (aparece na tela de game over). Devolve true se o dano entrou. */
  ferir(dano, ox, oy, causa = 'Desconhecido') {
    if (this.morto || this.intocavel) return false;
    const absorvido = Math.min(this.armadura, dano * JOGADOR.absorcaoArmadura);
    this.armadura -= absorvido;
    dano -= absorvido;
    this.vida -= dano;
    this.tInvencivel = JOGADOR.invencivelAposDano;
    const st = this.jogo.stats;
    st.danoSofrido += dano;
    st.danoPor[causa] = (st.danoPor[causa] || 0) + dano;
    st.causaMorte = causa;
    this.jogo.aoFerirJogador(dano, ox, oy);
    if (this.vida <= 0) {
      this.vida = 0;
      this.morto = true;
      this.jogo.aoMorrerJogador();
    }
    return true;
  }

  curar(v) {
    // a Soulsphere pode deixar a vida acima do máximo; uma cura comum não reduz isso
    if (this.vida < this.vidaMax) this.vida = Math.min(this.vidaMax, this.vida + v);
  }

  ganharArmadura(v) { this.armadura = Math.min(JOGADOR.armaduraMax, this.armadura + v); }

  desbloquear(idArma) {
    if (!this.armas[idArma]) this.armas[idArma] = { nivel: 1 };
    // arma nova já vem para a mão, menos a BFG: ela é disparada pelo botão direito
    if (idArma !== 'bfg') this.jogo.armas.trocar(idArma, true);
  }

  ganharXp(v) {
    this.xp += v * this.mods.xp;
    while (this.xp >= this.xpProx) {
      this.xp -= this.xpProx;
      this.nivel += 1;
      this.niveisPendentes += 1;
      this.xpProx = xpParaNivel(this.nivel);
    }
  }

  /** Efeito de um item coletado (o campo `efeito` de data/itens.js). */
  coletar(def, valor) {
    switch (def.efeito) {
      case 'xp': this.ganharXp(valor); sons.tocar('xp', 1, 0.03); return;
      case 'cura': this.curar(def.valor); break;
      case 'armadura': this.ganharArmadura(def.valor); break;
      case 'alma': this.vida = Math.min(this.vidaMax + 100, this.vida + def.valor); break;
      case 'berserk': this.tBerserk = def.valor; this.vida = Math.max(this.vida, Math.min(this.vidaMax, 100)); break;
      case 'invul': this.tInvul = def.valor; break;
      case 'ima': this.jogo.atrairTodoXp(); break;
      default: break;
    }
    sons.tocar(def.efeito === 'berserk' || def.efeito === 'invul' ? 'poder' : 'item');
    this.jogo.aoColetarItem(def);
  }
}
