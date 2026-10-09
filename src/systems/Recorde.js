// Recordes salvos no navegador (localStorage). Tudo em try/catch: em aba anônima
// ou com armazenamento bloqueado o jogo simplesmente não guarda o recorde.
const CHAVE = 'heavy-doom-metal-recorde-v1';

const VAZIO = { vitorias: 0, maiorOnda: 0, maisAbates: 0, maiorNivel: 0, maiorTempo: 0, melhorVitoria: 0 };

export function lerRecorde() {
  try {
    return { ...VAZIO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') };
  } catch {
    return { ...VAZIO };
  }
}

/** Atualiza o recorde com o resultado de uma run. Devolve { recorde, novo } (novo = bateu alguma marca). */
export function salvarRecorde(stats, vitoria) {
  const r = lerRecorde();
  let novo = false;
  const maior = (campo, valor) => { if (valor > r[campo]) { r[campo] = valor; novo = true; } };
  maior('maiorOnda', stats.onda);
  maior('maisAbates', stats.abates);
  maior('maiorNivel', stats.nivel);
  maior('maiorTempo', Math.floor(stats.tempo));
  if (vitoria) {
    r.vitorias += 1;
    // melhor vitória = a mais RÁPIDA
    if (!r.melhorVitoria || stats.tempo < r.melhorVitoria) { r.melhorVitoria = Math.floor(stats.tempo); novo = true; }
  }
  try { localStorage.setItem(CHAVE, JSON.stringify(r)); } catch { /* sem armazenamento: segue o jogo */ }
  return { recorde: r, novo };
}

export const formatarTempo = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
