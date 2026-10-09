// Diretor: conduz a run. Lê data/ondas.js, faz os inimigos nascerem fora da
// vista do jogador, passa de onda e, no fim, traz o chefão.
import { ONDAS, REGRAS_DE_ONDA as R } from '../data/ondas.js';
import { EFEITOS, INIMIGOS } from '../data/inimigos.js';
import { sons } from './Sons.js';

const T_PREPARO = 3;       // segundos antes da primeira onda
const T_AVISO_CHEFE = 4;   // do aviso até o chefão aparecer

export class Diretor {
  constructor(jogo) {
    this.jogo = jogo;
    this.fase = 'preparo';   // preparo -> onda -> avisoChefe -> chefe -> fim
    this.indice = -1;        // índice da onda atual em ONDAS
    this.t = 0;              // tempo dentro da fase/onda
    this.grupos = [];
    this.pos = { x: 0, y: 0 };
  }

  get numeroDaOnda() { return Math.min(this.indice + 1, ONDAS.length); }
  get totalDeOndas() { return ONDAS.length; }
  get multVida() { return 1 + R.vidaPorOnda * Math.max(0, this.indice); }
  get multDano() { return 1 + R.danoPorOnda * Math.max(0, this.indice); }

  atualizar(dt) {
    this.t += dt;
    switch (this.fase) {
      case 'preparo':
        if (this.t >= T_PREPARO) this.iniciarOnda(0);
        break;
      case 'onda': {
        const onda = ONDAS[this.indice];
        let faltam = false;
        for (const g of this.grupos) {
          // nasce em "pacotes": o próximo sai quando o relógio da onda passa da hora marcada
          while (g.feitos < g.qtd && this.t >= g.inicio + (g.fim - g.inicio) * (g.feitos / g.qtd)) {
            if (this.jogo.horda.vivos >= R.maxVivos) break;
            this.nascerPacote(g.tipo, Math.min(g.pacote, g.qtd - g.feitos));
            g.feitos += g.pacote;
          }
          if (g.feitos < g.qtd) faltam = true;
        }
        // limpou tudo antes da hora: adianta o relógio para o respiro final
        if (!faltam && this.jogo.horda.vivos === 0 && this.t < onda.duracao - R.pausaEntreOndas) this.t = onda.duracao - R.pausaEntreOndas;
        if (this.t >= onda.duracao) {
          if (this.indice + 1 < ONDAS.length) this.iniciarOnda(this.indice + 1);
          else this.avisarChefe();
        }
        break;
      }
      case 'avisoChefe':
        if (this.t >= T_AVISO_CHEFE) this.nascerChefe();
        break;
      default: break;
    }
  }

  iniciarOnda(i) {
    this.indice = i;
    this.fase = 'onda';
    this.t = 0;
    const onda = ONDAS[i];
    this.grupos = onda.grupos.map(g => ({
      tipo: g.tipo, qtd: g.qtd, pacote: g.pacote || 1, feitos: 0,
      inicio: g.inicio || 0, fim: g.fim ?? onda.duracao * 0.85,
    }));
    this.jogo.stats.onda = i + 1;
    this.jogo.anunciar(`ONDA ${i + 1}`, i === ONDAS.length - 1 ? 'A última antes do chefão' : '');
    sons.tocar('onda');
  }

  avisarChefe() {
    this.fase = 'avisoChefe';
    this.t = 0;
    this.jogo.anunciar('ALGO GRANDE SE APROXIMA', 'Prepare-se');
    sons.tocar('chefeRugido');
    sons.musica(true, true);
  }

  nascerChefe() {
    this.fase = 'chefe';
    this.t = 0;
    // nasce à frente do jogador, para a entrada ser vista
    const j = this.jogo.jogador;
    let pos = null;
    for (let d = 11; d >= 5 && !pos; d -= 1) {
      const x = j.x + Math.cos(j.ang) * d, y = j.y + Math.sin(j.ang) * d;
      if (this.jogo.mapa.livre(x, y, 1.4)) pos = { x, y };
    }
    pos = pos || this.posicaoDeNascimento(7, 12, 1.4) || { x: 22, y: 22 };
    const chefe = this.jogo.horda.criar('spider', pos.x, pos.y);
    this.jogo.efeitos.anim(EFEITOS.teleporte, pos.x, pos.y, 1.2, 4, 8);
    this.jogo.aoNascerChefe(chefe);
  }

  /**
   * Sorteia um ponto livre a uma distância [min, max] do jogador, de preferência
   * onde ele NÃO esteja olhando (atrás dele ou escondido por um pilar).
   */
  posicaoDeNascimento(min = R.distMin, max = R.distMax, raio = 0.5) {
    const { mapa, jogador: j, campo } = this.jogo;
    const cos = Math.cos(j.ang), sin = Math.sin(j.ang);
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min);
      const x = j.x + Math.cos(a) * d, y = j.y + Math.sin(a) * d;
      if (x < 1 || y < 1 || x >= mapa.l - 1 || y >= mapa.a - 1) continue;
      if (!mapa.livre(x, y, raio) || campo.distancia(x, y) < 0) continue;
      // nas primeiras tentativas exige estar fora da vista; depois aceita qualquer ponto livre
      if (tentativa < 25) {
        const naFrente = ((x - j.x) * cos + (y - j.y) * sin) / d > 0.55;
        if (naFrente && mapa.visivel(j.x, j.y, x, y)) continue;
      }
      this.pos.x = x; this.pos.y = y;
      return this.pos;
    }
    return null;
  }

  nascerPacote(tipo, qtd) {
    const centro = this.posicaoDeNascimento();
    if (!centro) return;
    const cx = centro.x, cy = centro.y;
    for (let i = 0; i < qtd; i++) {
      let x = cx, y = cy;
      if (i > 0) {
        x += (Math.random() * 2 - 1) * 1.2; y += (Math.random() * 2 - 1) * 1.2;
        if (!this.jogo.mapa.livre(x, y, 0.5)) { x = cx; y = cy; }
      }
      this.nascer(tipo, x, y, i === 0);
    }
  }

  nascer(tipo, x, y, comSom = false) {
    const e = this.jogo.horda.criar(tipo, x, y);
    if (!e) return null;
    this.jogo.efeitos.anim(EFEITOS.teleporte, x, y, INIMIGOS[tipo].voa || 0.5, 1.2, 16);
    if (comSom) this.jogo.somEm('teleporte', x, y, 0.7, 0.25);
    // o grito de "te vi" de quem tem um (Ghoul, Vassago) avisa que ele chegou
    const ver = INIMIGOS[tipo].sons?.ver;
    if (ver) this.jogo.somEm(ver, x, y, 1, 1.5);
    return e;
  }

  /** Faz nascer um inimigo num anel em volta de (x, y). Usado pelas invocações do chefão. */
  nascerEmVolta(tipo, x, y, rMin, rMax) {
    const { mapa } = this.jogo;
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const a = Math.random() * Math.PI * 2, d = rMin + Math.random() * (rMax - rMin);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (mapa.livre(px, py, 0.5)) return this.nascer(tipo, px, py);
    }
    const pos = this.posicaoDeNascimento(5, 9);
    return pos ? this.nascer(tipo, pos.x, pos.y) : null;
  }
}
