// Horda: o pool de inimigos e tudo que envolve "inimigos em conjunto":
// atualização, separação entre eles e consultas espaciais (quem está perto de X?).
//
// Para não comparar todo inimigo com todo inimigo (260 x 260 = 67 mil testes por
// quadro), cada um é registrado numa GRADE com células de 1 unidade. Para saber
// quem está perto de um ponto basta olhar as células vizinhas.
import { Pool } from './Pool.js';
import { novoInimigo, iniciarInimigo, atualizarInimigo, desenharInimigo, ferirInimigo, matarInimigo } from '../entities/Inimigo.js';

const MAX_INIMIGOS = 340;
const RAIO_MAX = 1.2; // maior raio de inimigo (o chefão); define quantas células vizinhas olhar

export class Horda {
  constructor(jogo) {
    this.jogo = jogo;
    this.pool = new Pool(novoInimigo, MAX_INIMIGOS);
    this.vivos = 0;
    this.chefe = null;
    const { l, a } = jogo.mapa;
    // Grade como listas encadeadas em arrays tipados: cabeca[celula] aponta o
    // primeiro inimigo da célula, prox[i] aponta o seguinte. Zero alocação por quadro.
    this.cabeca = new Int32Array(l * a);
    this.prox = new Int32Array(MAX_INIMIGOS);
  }

  criar(tipo, x, y) {
    const e = this.pool.obter();
    if (!e) return null;
    iniciarInimigo(e, tipo, x, y, this.jogo);
    this.vivos += 1;
    if (e.def.chefe) this.chefe = e;
    return e;
  }

  atualizar(dt) {
    const { jogo } = this;
    const ativos = this.pool.ativos;
    for (let i = 0; i < ativos.length; i++) atualizarInimigo(ativos[i], dt, jogo);
    this.pool.limpar();
    this.montarGrade();
    this.separar();
  }

  montarGrade() {
    const l = this.jogo.mapa.l, ativos = this.pool.ativos;
    this.cabeca.fill(-1);
    for (let i = 0; i < ativos.length; i++) {
      const e = ativos[i];
      e.idx = i;
      if (!e.vivo) continue;
      const c = (e.y | 0) * l + (e.x | 0);
      this.prox[i] = this.cabeca[c];
      this.cabeca[c] = i;
    }
  }

  /** Chama fn(inimigo) para cada inimigo vivo cujo centro está a até `alcance` células de (x, y). */
  vizinhos(x, y, alcance, fn) {
    const { l, a } = this.jogo.mapa, ativos = this.pool.ativos;
    const x0 = Math.max(0, Math.floor(x - alcance)), x1 = Math.min(l - 1, Math.floor(x + alcance));
    const y0 = Math.max(0, Math.floor(y - alcance)), y1 = Math.min(a - 1, Math.floor(y + alcance));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (let i = this.cabeca[cy * l + cx]; i >= 0; i = this.prox[i]) fn(ativos[i]);
      }
    }
  }

  /** Empurra para fora quem está sobreposto (inimigo x inimigo e inimigo x jogador). */
  separar() {
    const { mapa, jogador } = this.jogo;
    const ativos = this.pool.ativos, l = mapa.l, a = mapa.a;
    for (let i = 0; i < ativos.length; i++) {
      const e = ativos[i];
      if (!e.vivo) continue;
      const alc = e.raio > 0.6 ? 2 : 1;
      const cx0 = Math.max(0, (e.x | 0) - alc), cx1 = Math.min(l - 1, (e.x | 0) + alc);
      const cy0 = Math.max(0, (e.y | 0) - alc), cy1 = Math.min(a - 1, (e.y | 0) + alc);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          for (let k = this.cabeca[cy * l + cx]; k >= 0; k = this.prox[k]) {
            if (k <= i) continue; // cada par é tratado uma vez só
            const o = ativos[k];
            const dx = o.x - e.x, dy = o.y - e.y;
            const soma = e.raio + o.raio;
            const d2 = dx * dx + dy * dy;
            if (d2 >= soma * soma) continue;
            const d = Math.sqrt(d2) || 0.01;
            const sobra = soma - d;
            // o mais "pesado" (raio maior) cede menos; o chefão não cede nada
            let pe = o.raio * o.raio, po = e.raio * e.raio;
            if (e.def.chefe) pe = 0;
            if (o.def.chefe) po = 0;
            const total = pe + po || 1;
            const ux = dx / d, uy = dy / d;
            mapa.mover(e, -ux * sobra * (pe / total), -uy * sobra * (pe / total));
            mapa.mover(o, ux * sobra * (po / total), uy * sobra * (po / total));
          }
        }
      }
      // contra o jogador: o inimigo é que sai da frente (menos o chefão, que empurra o jogador)
      const dx = e.x - jogador.x, dy = e.y - jogador.y;
      const soma = e.raio + jogador.raio + 0.22; // folga extra: ninguém fica colado na câmera
      const d2 = dx * dx + dy * dy;
      if (d2 < soma * soma && e.estado !== 'investida') {
        const d = Math.sqrt(d2) || 0.01, sobra = soma - d;
        if (e.def.chefe) mapa.mover(jogador, (-dx / d) * sobra, (-dy / d) * sobra);
        else mapa.mover(e, (dx / d) * sobra, (dy / d) * sobra);
      }
    }
  }

  /** Primeiro inimigo vivo que encosta no círculo (x, y, raio). Usado pelos projéteis do jogador. */
  primeiroEm(x, y, raio) {
    let achado = null;
    this.vizinhos(x, y, raio + RAIO_MAX, (e) => {
      if (achado || !e.vivo || e.estado === 'nascer') return;
      const soma = e.raio + raio;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy < soma * soma) achado = e;
    });
    return achado;
  }

  /** Dano em área com queda pela distância (60% na borda). Devolve quantos acertou. */
  danoEmArea(x, y, raio, dano, empurrao = 0, ignorar = null, critico = false) {
    // junta os alvos antes de aplicar o dano: uma morte pode disparar outra explosão,
    // e mexer na horda no meio da varredura da grade daria confusão
    const alvos = [];
    this.vizinhos(x, y, raio + RAIO_MAX, (e) => {
      if (e === ignorar || !e.vivo) return;
      const d = Math.hypot(e.x - x, e.y - y) - e.raio;
      if (d < raio) alvos.push(e, Math.max(0, d));
    });
    for (let i = 0; i < alvos.length; i += 2) {
      ferirInimigo(alvos[i], dano * (1 - (alvos[i + 1] / raio) * 0.4), this.jogo, critico, x, y, empurrao);
    }
    return alvos.length / 2;
  }

  /** Mata todo mundo (usado quando o chefão morre). */
  matarTodos(menos) {
    for (const e of this.pool.ativos) if (e.vivo && e !== menos) matarInimigo(e, this.jogo, true);
  }

  desenhar(rc) {
    const ativos = this.pool.ativos;
    for (let i = 0; i < ativos.length; i++) desenharInimigo(ativos[i], rc);
  }
}
