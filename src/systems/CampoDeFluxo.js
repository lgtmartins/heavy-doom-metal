// Campo de fluxo: o "GPS" da horda.
//
// Em vez de cada um dos 200+ inimigos calcular seu próprio caminho, fazemos UMA
// busca em largura (BFS) saindo da célula do jogador. Cada célula fica sabendo a
// quantos passos está dele; para perseguir, o inimigo só precisa andar para a
// célula vizinha de menor número. É barato e contorna pilares sozinho.
export class CampoDeFluxo {
  constructor(mapa) {
    this.mapa = mapa;
    this.dist = new Int16Array(mapa.l * mapa.a);
    this.fila = new Int32Array(mapa.l * mapa.a);
    this.dir = { x: 0, y: 0 };
  }

  /** Recalcula as distâncias a partir da posição (x, y). Chamado algumas vezes por segundo. */
  atualizar(x, y) {
    const { l, a, paredes } = this.mapa;
    const { dist, fila } = this;
    dist.fill(-1);
    const inicio = (y | 0) * l + (x | 0);
    if (paredes[inicio]) return;
    let cabeca = 0, cauda = 0;
    fila[cauda++] = inicio;
    dist[inicio] = 0;
    while (cabeca < cauda) {
      const c = fila[cabeca++];
      const cx = c % l, cy = (c - cx) / l, d = dist[c] + 1;
      if (cx > 0 && !paredes[c - 1] && dist[c - 1] < 0) { dist[c - 1] = d; fila[cauda++] = c - 1; }
      if (cx < l - 1 && !paredes[c + 1] && dist[c + 1] < 0) { dist[c + 1] = d; fila[cauda++] = c + 1; }
      if (cy > 0 && !paredes[c - l] && dist[c - l] < 0) { dist[c - l] = d; fila[cauda++] = c - l; }
      if (cy < a - 1 && !paredes[c + l] && dist[c + l] < 0) { dist[c + l] = d; fila[cauda++] = c + l; }
    }
  }

  /** Passos até o jogador a partir de (x, y); -1 se inalcançável. */
  distancia(x, y) {
    return this.dist[(y | 0) * this.mapa.l + (x | 0)];
  }

  /**
   * Direção (normalizada) que um inimigo em (x, y) deve seguir. O resultado fica
   * em this.dir (objeto reutilizado, para não alocar nada por inimigo por quadro).
   */
  direcao(x, y) {
    const { l, a } = this.mapa;
    const { dist, dir } = this;
    const cx = x | 0, cy = y | 0;
    let melhor = dist[cy * l + cx];
    let bx = 0, by = 0;
    if (melhor < 0) melhor = 32767;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= l || ny >= a) continue;
        const d = dist[ny * l + nx];
        if (d < 0 || d >= melhor) continue;
        // na diagonal, os dois vizinhos retos têm de estar livres (senão cortaria a quina do pilar)
        if (dx && dy && (dist[cy * l + nx] < 0 || dist[ny * l + cx] < 0)) continue;
        melhor = d; bx = dx; by = dy;
      }
    }
    if (!bx && !by) { dir.x = 0; dir.y = 0; return dir; }
    // mira o centro da célula escolhida
    const tx = cx + bx + 0.5 - x, ty = cy + by + 0.5 - y;
    const n = Math.hypot(tx, ty) || 1;
    dir.x = tx / n; dir.y = ty / n;
    return dir;
  }
}
