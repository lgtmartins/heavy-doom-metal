// Os RAIOS da guitarra. Tudo aqui é balanceamento: mexa à vontade.
//
// No Heavy Doom Metal só existe uma arma, a guitarra. O que o jogador desbloqueia e
// troca (teclas 1-5) são TIPOS DE RAIO, cada um com uma cor e um comportamento. O
// Solo Final (branco) é a "ultimate": botão direito, com recarga longa.
//
// Por baixo, cada raio ocupa o lugar de uma arma do jogo original, e por isso os
// nomes internos (`id`) continuam os antigos: 'pistola', 'shotgun', 'chaingun',
// 'foguete', 'plasma', 'bfg'. O jogador nunca vê o `id`, só o `nome`.
//
//   dano        dano por raio (nos explosivos, o dano da explosão no centro)
//   intervalo   segundos entre disparos (a cadência do jogador divide esse valor)
//   projeteis   quantos raios saem por disparo;  leque = ângulo (rad) entre eles
//   dispersao   imprecisão aleatória (rad)
//   alcance     distância máxima (ausente = até a parede)
//   explosao    se existir, o raio explode onde cai: { raio, quadros, escala, som, empurrao,
//               feridaPropria (fração do dano que VOCÊ leva se estiver perto) }
//   suprema     true = ultimate: usa `recarga` (s) e `atraso` (s de "carga" antes do raio cair)
//   tracos      (ultimate) todo inimigo à vista leva um raio extra com `fracao` do dano
//   cor         qual versão colorida dos sprites usar (geradas por tools/gerar-heavy.ps1)
//   ritmo       duração de cada pose da guitarra ao disparar: [carga, ataque 1, ataque 2, recuo]
//               (ou 'rapido': alterna só as duas poses de ataque, para raios de cadência alta)
//   evolucao    o que cada nível extra do raio dá (carta "evoluir")

const fx = (l, ...cs) => cs.map(c => `fx_${l}_${c}`);
const g = (pose, cor) => `guitarra_${pose}_${cor}`;

/** Os sprites do raio que cai do céu e da faísca de impacto, numa cor. */
function raioDe(cor, segmentos = 3) {
  const b = [g('beam1', cor), g('beam2', cor), g('beam3', cor)];
  return {
    // cada segmento da coluna começa num frame diferente, para não parecer um carimbo repetido
    quadros: [b, [b[1], b[2], b[0]], [b[2], b[0], b[1]]],
    impacto: [g('hit1', cor), g('hit2', cor), g('hit3', cor)],
    segmentos, // quantos pedaços empilhados (cada um tem 1,5 unidade de altura)
  };
}

// Como a guitarra aparece na tela. Na arte original (160x220) ela está de pé, com a mão
// embaixo; aqui ela é girada para ficar quase na horizontal, atravessando a parte de
// baixo da tela, como se o guitarrista estivesse tocando. Para ajustar a pose:
//   rotacao  graus; negativo = anti-horário. -78 deixaria o braço da guitarra totalmente
//            horizontal; -55 deixa a ponta mais alta que a mão e o lado direito descendo
//            para trás do HUD
//   escala   ampliação na tela
//   origem   o ponto do frame que fica "preso": a mão ([0,0] = canto de cima à esquerda
//            do frame, [1,1] = canto de baixo à direita). A guitarra gira em torno dele.
//            O frame tem 160x310: os 220 px da arte original + 90 px de braço da guitarra
//            alongado por tools/gerar-heavy.ps1, para ele não parecer serrado depois da mão
//   x, y     onde esse ponto fica, em px de tela, a partir do MEIO da BORDA DE CIMA do HUD
//            (x positivo = direita; y negativo = sobe). Com y: -8 a munhequeira encosta
//            no HUD, que esconde o corte reto onde a arte da mão termina
export const POSE_DA_GUITARRA = { rotacao: -55, escala: 2.2, origem: [118 / 160, 205 / 310], x: 70, y: -8 };

/**
 * A guitarra em primeira pessoa, numa cor.
 * Cada passo de uma sequência é [frame, duração em s, null]; o `null` é o lugar do "clarão"
 * que as armas do Doom tinham e a guitarra não usa.
 */
function vistaDe(cor, ritmo) {
  const sequencias = ritmo === 'rapido'
    ? [[[g('fire1', cor), 0.045, null]], [[g('fire2', cor), 0.045, null]]]
    : [[[g('charge', cor), ritmo[0], null], [g('fire1', cor), ritmo[1], null], [g('fire2', cor), ritmo[2], null], [g('recoil', cor), ritmo[3], null]]];
  return { parado: 'guitarra_idle', ...POSE_DA_GUITARRA, sequencias };
}

export const ARMAS = {
  // 1. O raio inicial: um disparo preciso.
  pistola: {
    id: 'pistola', nome: 'Raio Azul', tecla: 1, cor: 'azul', icone: g('icone', 'azul'), som: 'raioAzul',
    dano: 16, intervalo: 0.3, projeteis: 1, leque: 0.045, dispersao: 0.012,
    tremor: 1.2, luz: 70, recuo: 3,
    raio: raioDe('azul'), vista: vistaDe('azul', [0.05, 0.07, 0.06, 0.08]),
    evolucao: { dano: 0.3 },
  },
  // 2. Vários raios espalhados de uma vez: devastador de perto, fraco de longe.
  shotgun: {
    id: 'shotgun', nome: 'Raio em Leque', tecla: 2, cor: 'verde', icone: g('icone', 'verde'), som: 'raioVerde',
    dano: 11, intervalo: 0.82, projeteis: 7, leque: 0.035, dispersao: 0.02, alcance: 22,
    tremor: 4, luz: 110, recuo: 9, empurrao: 2.2,
    raio: raioDe('verde', 2), vista: vistaDe('verde', [0.06, 0.09, 0.09, 0.3]),
    evolucao: { dano: 0.2, projeteis: 2 },
  },
  // 3. Cadência altíssima, pouco dano por raio e alguma imprecisão.
  chaingun: {
    id: 'chaingun', nome: 'Raio Contínuo', tecla: 3, cor: 'amarelo', icone: g('icone', 'amarelo'), som: 'raioAmarelo',
    dano: 10, intervalo: 0.085, projeteis: 1, leque: 0.05, dispersao: 0.035,
    tremor: 1.0, luz: 70, recuo: 2,
    raio: raioDe('amarelo', 2), vista: vistaDe('amarelo', 'rapido'),
    evolucao: { dano: 0.25 },
  },
  // 4. Cai e explode: dano em área. Cuidado para não disparar colado na parede.
  foguete: {
    id: 'foguete', nome: 'Raio Explosivo', tecla: 4, cor: 'vermelho', icone: g('icone', 'vermelho'), som: 'raioVermelho',
    dano: 85, intervalo: 0.8, projeteis: 1, leque: 0.12, dispersao: 0,
    tremor: 3, luz: 90, recuo: 8,
    explosao: { raio: 2.6, quadros: fx(21, 0, 1, 2), escala: 1.5, som: 'explosao', empurrao: 5, feridaPropria: 0.2 },
    raio: raioDe('vermelho'), vista: vistaDe('vermelho', [0.06, 0.09, 0.09, 0.25]),
    evolucao: { dano: 0.25, area: 0.12 },
  },
  // 5. O mais forte dos raios rápidos.
  plasma: {
    id: 'plasma', nome: 'Tempestade', tecla: 5, cor: 'roxo', icone: g('icone', 'roxo'), som: 'raioRoxo',
    dano: 17, intervalo: 0.095, projeteis: 1, leque: 0.07, dispersao: 0.025,
    tremor: 0.8, luz: 60, recuo: 2,
    raio: raioDe('roxo', 2), vista: vistaDe('roxo', 'rapido'),
    evolucao: { dano: 0.25 },
  },
  // Ultimate (botão direito ou tecla 6): a guitarra carrega, um raio gigante explode onde
  // você mira e cada inimigo à vista leva um raio extra.
  bfg: {
    id: 'bfg', nome: 'Solo Final', tecla: 6, cor: 'branco', icone: g('icone', 'branco'), som: 'soloFinal',
    suprema: true, recarga: 18, atraso: 0.55,
    dano: 420, intervalo: 1.1, projeteis: 1, leque: 0, dispersao: 0,
    tremor: 7, luz: 160, recuo: 12,
    explosao: { raio: 5, quadros: [g('hit1', 'branco'), g('hit2', 'branco'), g('hit3', 'branco'), g('hit2', 'branco')], escala: 6, som: 'bfgExplosao', empurrao: 8, feridaPropria: 0 },
    tracos: { fracao: 0.45, alcance: 16 },
    raio: raioDe('branco', 4), vista: vistaDe('branco', [0.3, 0.25, 0.25, 0.3]),
    evolucao: { dano: 0.3, recarga: -3 },
  },
};

export const ORDEM_ARMAS = ['pistola', 'shotgun', 'chaingun', 'foguete', 'plasma', 'bfg'];
export const NIVEL_MAX_ARMA = 4;

// Botão geral de poder de fogo: multiplica o dano de TODOS os raios de uma vez.
// 1 = os valores da tabela acima; 2 = o dobro. É o jeito rápido de deixar o jogo
// mais fácil ou mais difícil sem mexer raio por raio.
export const PODER_DE_FOGO = 2;
