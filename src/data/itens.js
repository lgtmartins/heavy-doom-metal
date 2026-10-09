// Itens que os inimigos soltam (atlas "pickups").
//
//   quadros   animação;  escala  tamanho no mundo
//   efeito    nome da função em entities/Jogador.js -> coletar()
//   valor     parâmetro do efeito
//   vida      segundos até sumir (ausente = fica para sempre)

const p = (...cs) => cs.map(c => `pickups_${c}`);

export const ITENS = {
  xp: { quadros: p('3_0', '3_1', '3_2', '3_3', '3_2', '3_1'), fps: 8, escala: 1.1, efeito: 'xp', atraido: true },
  xpGrande: { quadros: p('3_4', '3_5', '3_6', '3_7', '3_6', '3_5'), fps: 8, escala: 1.2, efeito: 'xp', atraido: true },
  estimulante: { quadros: p('3_8'), escala: 1, efeito: 'cura', valor: 12, vida: 40, msg: 'Estimulante: +12 de vida' },
  medkit: { quadros: p('3_11'), escala: 1, efeito: 'cura', valor: 30, vida: 40, msg: 'Medkit: +30 de vida' },
  armadura: { quadros: p('3_14', '3_15'), fps: 4, escala: 1, efeito: 'armadura', valor: 50, vida: 45, msg: 'Armadura: +50' },
  megaArmadura: { quadros: p('3_16', '3_17'), fps: 4, escala: 1, efeito: 'armadura', valor: 100, vida: 45, msg: 'Mega armadura: +100' },
  alma: { quadros: p('3_18', '3_19', '3_20', '3_21', '3_20', '3_19'), fps: 6, escala: 1, efeito: 'alma', valor: 100, vida: 45, msg: 'Soulsphere: +100 de vida!' },
  berserk: { quadros: p('4_15'), escala: 1, efeito: 'berserk', valor: 15, vida: 45, msg: 'BERSERK! Dano em dobro' },
  invul: { quadros: p('4_5', '4_6', '4_7', '4_8', '4_7', '4_6'), fps: 6, escala: 1, efeito: 'invul', valor: 10, vida: 45, msg: 'INVULNERÁVEL!' },
  ima: { quadros: p('3_22', '3_23', '3_24', '3_25', '3_24', '3_23'), fps: 6, escala: 1, efeito: 'ima', vida: 45, msg: 'Megasphere: todo o XP veio até você' },
};

// Chance de um inimigo comum soltar ALGO além do XP, e os pesos do sorteio.
// A "sorte" do jogador multiplica a chance.
export const DROPS = {
  chance: 0.045,
  chanceTanque: 0.6,     // Vassago quase sempre solta algo
  pesos: { estimulante: 34, medkit: 20, armadura: 18, megaArmadura: 4, berserk: 7, invul: 5, alma: 4, ima: 8 },
};
