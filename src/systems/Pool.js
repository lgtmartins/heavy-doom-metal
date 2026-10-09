// Object pooling: em vez de criar e destruir objetos o tempo todo (o que faz o
// coletor de lixo do JavaScript travar o jogo por alguns milissegundos), os
// objetos "mortos" voltam para uma lista de livres e são reaproveitados.
export class Pool {
  /**
   * @param {() => object} criar  fábrica de um objeto novo (chamada só quando falta objeto livre)
   * @param {number} max          teto de objetos; ao atingir, obter() devolve null
   */
  constructor(criar, max) {
    this.criar = criar;
    this.max = max;
    this.total = 0;
    this.livres = [];
    this.ativos = [];
  }

  obter() {
    let o = this.livres.pop();
    if (!o) {
      if (this.total >= this.max) return null;
      o = this.criar();
      this.total++;
    }
    o.ativo = true;
    this.ativos.push(o);
    return o;
  }

  /** Marca para remoção. O objeto só sai de `ativos` no próximo limpar(), então é seguro soltar no meio de um loop. */
  soltar(o) { o.ativo = false; }

  /** Tira os inativos de `ativos` (compactando o array no lugar) e devolve-os à lista de livres. */
  limpar() {
    const a = this.ativos;
    let j = 0;
    for (let i = 0; i < a.length; i++) {
      const o = a[i];
      if (o.ativo) a[j++] = o; else this.livres.push(o);
    }
    a.length = j;
  }

  soltarTodos() {
    for (const o of this.ativos) o.ativo = false;
    this.limpar();
  }
}
