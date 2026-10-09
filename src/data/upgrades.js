// Cartas de upgrade oferecidas ao subir de nível. Cartas são DADOS: para criar
// uma nova, basta acrescentar um objeto aqui.
//
//   max      quantas vezes a carta pode ser escolhida na run
//   peso     chance relativa de aparecer entre as 3 opções
//   requer   (jogador) => bool, opcional: condição para a carta poder aparecer
//   aplicar  (jogador) => void: o que ela faz (mexe nos `mods` do jogador)

import { ARMAS, ORDEM_ARMAS, NIVEL_MAX_ARMA } from './armas.js';

const GERAIS = [
  { id: 'dano', nome: 'Fúria', desc: '+20% de dano em todos os raios', icone: 'pickups_4_15', max: 6, peso: 10, aplicar: j => { j.mods.dano += 0.2; } },
  { id: 'cadencia', nome: 'Palhetada Rápida', desc: '+12% de cadência dos raios', icone: 'pickups_1_1', max: 6, peso: 10, aplicar: j => { j.mods.cadencia += 0.12; } },
  { id: 'velocidade', nome: 'Adrenalina', desc: '+8% de velocidade de movimento', icone: 'pickups_4_1', max: 5, peso: 8, aplicar: j => { j.mods.vel += 0.08; } },
  { id: 'vida', nome: 'Vitalidade', desc: '+25 de vida máxima e cura 25', icone: 'pickups_3_18', max: 6, peso: 9, aplicar: j => { j.vidaMax += 25; j.curar(25); } },
  { id: 'armadura', nome: 'Blindagem', desc: '+75 de armadura agora', icone: 'pickups_3_14', max: 99, peso: 5, aplicar: j => { j.ganharArmadura(75); } },
  { id: 'coleta', nome: 'Magnetismo', desc: '+50% de área de coleta de XP', icone: 'pickups_3_22', max: 4, peso: 8, aplicar: j => { j.mods.coleta += 0.5; } },
  { id: 'projeteis', nome: 'Raio Duplo', desc: '+1 raio por disparo (com metade do dano)', icone: 'pickups_1_2', max: 3, peso: 6, requer: j => j.nivel >= 3, aplicar: j => { j.mods.projeteis += 1; } },
  { id: 'critico', nome: 'Olho de Águia', desc: '+10% de chance de crítico (dano x2)', icone: 'pickups_4_9', max: 5, peso: 8, aplicar: j => { j.mods.critico += 0.1; } },
  { id: 'area', nome: 'Carga Explosiva', desc: '+20% de raio das explosões', icone: 'pickups_1_3', max: 4, peso: 6, requer: j => !!(j.armas.foguete || j.armas.bfg), aplicar: j => { j.mods.area += 0.2; } },
  { id: 'perfuracao', nome: 'Raio Perfurante', desc: 'O raio atravessa +1 inimigo', icone: 'pickups_1_0', max: 3, peso: 6, aplicar: j => { j.mods.perfuracao += 1; } },
  { id: 'regen', nome: 'Regeneração', desc: 'Recupera +1 de vida por segundo', icone: 'pickups_3_8', max: 3, peso: 6, aplicar: j => { j.mods.regen += 1; } },
  { id: 'xp', nome: 'Sede de Sangue', desc: '+15% de XP ganho', icone: 'pickups_4_11', max: 4, peso: 7, aplicar: j => { j.mods.xp += 0.15; } },
  { id: 'sorte', nome: 'Mochila', desc: 'Inimigos soltam 40% mais itens', icone: 'pickups_2_1', max: 3, peso: 6, aplicar: j => { j.mods.sorte += 0.4; } },
  { id: 'dash', nome: 'Reflexos', desc: 'Dash recarrega 20% mais rápido', icone: 'pickups_4_0', max: 4, peso: 6, aplicar: j => { j.mods.dashRecarga *= 0.8; } },
];

// Uma carta "novo raio" e uma carta "evoluir" para cada raio (menos o azul, que já vem).
const NIVEL_PARA_LIBERAR = { shotgun: 2, chaingun: 4, foguete: 6, plasma: 8, bfg: 10 };

function descEvolucao(arma) {
  const e = arma.evolucao, partes = [];
  if (e.dano) partes.push(`+${Math.round(e.dano * 100)}% de dano`);
  if (e.projeteis) partes.push(`+${e.projeteis} raios`);
  if (e.area) partes.push(`+${Math.round(e.area * 100)}% de explosão`);
  if (e.recarga) partes.push(`${e.recarga}s de recarga`);
  return partes.join(', ');
}

const DE_ARMAS = ORDEM_ARMAS.flatMap((id) => {
  const arma = ARMAS[id];
  const cartas = [{
    id: `evo_${id}`, nome: `${arma.nome} +`, desc: `Evolui o raio: ${descEvolucao(arma)}`, icone: arma.icone, arma: id,
    max: NIVEL_MAX_ARMA - 1, peso: 7, requer: j => !!j.armas[id], aplicar: j => { j.armas[id].nivel += 1; },
  }];
  if (id !== 'pistola') {
    cartas.push({
      id: `arma_${id}`, nome: arma.nome, desc: arma.suprema ? `NOVO RAIO supremo (botão direito ou tecla ${arma.tecla})` : `NOVO RAIO (tecla ${arma.tecla})`,
      icone: arma.icone, arma: id, nova: true, max: 1, peso: 16,
      requer: j => !j.armas[id] && j.nivel >= NIVEL_PARA_LIBERAR[id], aplicar: j => { j.desbloquear(id); },
    });
  }
  return cartas;
});

export const UPGRADES = [...GERAIS, ...DE_ARMAS];

// Aparece só se não houver 3 cartas válidas (tudo no máximo).
export const CARTA_RESERVA = { id: 'cura', nome: 'Medkit', desc: 'Cura 40 de vida', icone: 'pickups_3_11', max: 999, peso: 1, aplicar: j => { j.curar(40); } };

/** XP necessário para passar do nível n para o n+1. */
export const xpParaNivel = (n) => Math.floor(5 + n * 5 + n * n * 0.8);

/** Sorteia `qtd` cartas diferentes entre as válidas, respeitando os pesos. */
export function sortearCartas(jogador, qtd = 3) {
  const validas = UPGRADES.filter(c => (jogador.cartas[c.id] || 0) < c.max && (!c.requer || c.requer(jogador)));
  const escolhidas = [];
  while (escolhidas.length < qtd && validas.length > 0) {
    let r = Math.random() * validas.reduce((s, c) => s + c.peso, 0);
    let i = 0;
    while (i < validas.length - 1 && (r -= validas[i].peso) > 0) i++;
    escolhidas.push(validas.splice(i, 1)[0]);
  }
  while (escolhidas.length < qtd) escolhidas.push(CARTA_RESERVA);
  return escolhidas;
}
