// Números do chefão (Spider Mastermind). A vida e a velocidade base estão em data/inimigos.js.
export const CHEFE = {
  fracaoFuria: 0.5,            // abaixo de 50% de vida entra em fúria
  velFuria: 2.9,
  pausaEntreAtaques: [1.6, 0.9], // [normal, fúria] segundos andando entre um ataque e outro
  contato: { dano: 22, intervalo: 0.8 },

  // Padrão 1: rajada de metralhadora mirada no jogador. Corra de lado ou use um pilar.
  rajada: { duracao: [2.4, 3.2], intervalo: [0.085, 0.06], dano: 7, vel: 15, dispersao: 0.07, projetil: 'bala' },
  // Padrão 2: anéis de orbes lentos; a saída é passar pelos vãos.
  anel: { aneis: [2, 4], porAnel: [18, 22], intervalo: 0.55, dano: 14, vel: [5.2, 6.2], projetil: 'orbe', projetilFuria: 'orbeVerde' },
  // Padrão 3: invoca reforços.
  invocar: { preparo: 1.0, grupos: [[['lostsoul', 5], ['banshee', 2]], [['lostsoul', 6], ['banshee', 5], ['ghoul', 3]]] },
  // Padrão 4 (só na fúria): investida.
  investida: { preparo: 0.7, vel: 10, duracao: 1.1, dano: 34 },

  invocarAoEnfurecer: [['vassago', 2], ['banshee', 6]],
};
