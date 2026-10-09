// Ondas da run. Cada onda dura `duracao` segundos e tem grupos de inimigos:
//
//   { tipo, qtd, inicio?, fim?, pacote? }
//     qtd      total de inimigos do grupo na onda
//     inicio   segundo em que o grupo começa a aparecer (padrão 0)
//     fim      segundo em que o último aparece (padrão 85% da duração)
//     pacote   quantos nascem juntos de cada vez (padrão 1)
//
// Os inimigos que sobrarem continuam vivos na onda seguinte. Se você limpar
// tudo antes do tempo, a próxima onda começa mais cedo.
// Depois da última onda vem o chefão (data/chefe.js).

export const ONDAS = [
  { duracao: 40, grupos: [{ tipo: 'blob', qtd: 48, pacote: 3 }] },
  { duracao: 45, grupos: [{ tipo: 'blob', qtd: 64, pacote: 3 }, { tipo: 'lostsoul', qtd: 10, pacote: 2, inicio: 8 }] },
  { duracao: 48, grupos: [{ tipo: 'blob', qtd: 72, pacote: 4 }, { tipo: 'lostsoul', qtd: 18, pacote: 2 }, { tipo: 'banshee', qtd: 8, pacote: 2, inicio: 12 }] },
  { duracao: 50, grupos: [{ tipo: 'blob', qtd: 80, pacote: 4 }, { tipo: 'banshee', qtd: 16, pacote: 2 }, { tipo: 'ghoul', qtd: 11, pacote: 1, inicio: 6 }] },
  { duracao: 52, grupos: [{ tipo: 'blob', qtd: 90, pacote: 5 }, { tipo: 'lostsoul', qtd: 28, pacote: 2 }, { tipo: 'ghoul', qtd: 16, pacote: 1 }, { tipo: 'vassago', qtd: 2, inicio: 15 }] },
  { duracao: 54, grupos: [{ tipo: 'blob', qtd: 105, pacote: 6 }, { tipo: 'banshee', qtd: 26, pacote: 2 }, { tipo: 'ghoul', qtd: 20, pacote: 1 }, { tipo: 'vassago', qtd: 3, inicio: 6 }] },
  { duracao: 55, grupos: [{ tipo: 'blob', qtd: 120, pacote: 6 }, { tipo: 'lostsoul', qtd: 40, pacote: 3 }, { tipo: 'banshee', qtd: 24, pacote: 2 }, { tipo: 'ghoul', qtd: 24, pacote: 1 }, { tipo: 'vassago', qtd: 4, inicio: 6 }] },
  { duracao: 56, grupos: [{ tipo: 'blob', qtd: 140, pacote: 7 }, { tipo: 'lostsoul', qtd: 46, pacote: 3 }, { tipo: 'banshee', qtd: 34, pacote: 3 }, { tipo: 'ghoul', qtd: 30, pacote: 2 }, { tipo: 'vassago', qtd: 5, inicio: 6 }] },
  { duracao: 58, grupos: [{ tipo: 'blob', qtd: 160, pacote: 7 }, { tipo: 'lostsoul', qtd: 52, pacote: 3 }, { tipo: 'banshee', qtd: 42, pacote: 3 }, { tipo: 'ghoul', qtd: 36, pacote: 2 }, { tipo: 'vassago', qtd: 7, inicio: 6 }] },
  { duracao: 60, grupos: [{ tipo: 'blob', qtd: 185, pacote: 8 }, { tipo: 'lostsoul', qtd: 58, pacote: 3 }, { tipo: 'banshee', qtd: 48, pacote: 3 }, { tipo: 'ghoul', qtd: 42, pacote: 2 }, { tipo: 'vassago', qtd: 9, inicio: 6 }] },
];

export const REGRAS_DE_ONDA = {
  vidaPorOnda: 0.2,       // +20% de vida dos inimigos a cada onda
  danoPorOnda: 0.05,      // +5% de dano a cada onda
  maxVivos: 260,          // teto de inimigos vivos (o nascimento espera abrir vaga)
  distMin: 9,             // distância mínima do jogador para nascer
  distMax: 19,
  pausaEntreOndas: 3,     // respiro quando a onda é limpa antes do tempo
};
