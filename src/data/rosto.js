// Qual rosto do HUD aparece em cada situação.
//
// Os frames se chamam rosto_<linha>_<coluna>, na ordem da sheet original
// (Assets/heavy/face.png). Para ver todos com o nome por cima, rode
//   powershell -ExecutionPolicy Bypass -File tools\gerar-heavy.ps1 -Conferir
// e abra tools/debug/rosto-conferencia.png.
//
// Quase tudo aqui é uma lista de 5 posições, uma por NÍVEL DE SAÚDE:
//   [acima de 80%, 60-80%, 40-60%, 20-40%, abaixo de 20%]
// Trocar um rosto é só trocar o nome na posição certa.

const r = (...nomes) => nomes.map(n => `rosto_${n}`);

export const ROSTO = {
  // Parado: em cada nível de saúde ele alterna entre estas variações.
  parado: [
    r('0_0', '0_1', '0_2'),
    r('0_3', '4_4', '4_5'),
    r('4_6', '4_7', '5_0'),
    r('0_4', '5_1'),
    r('4_3'),
  ],
  dor: r('1_0', '1_1', '1_2', '1_3', '1_5'),        // golpe pela frente ou pelas costas: grito
  dorDeLado: r('1_6', '1_7', '2_6', '3_4', '3_5'),  // golpe pelo lado: vira o rosto (desenhado olhando para a esquerda)
  raiva: r('2_0', '2_1', '2_2', '2_4', '2_5'),      // durante o berserk
  sorriso: r('4_2', '4_0', '4_1', '4_1', '4_1'),    // ao pegar um item
  invulneravel: 'rosto_3_3',                         // língua de fora
  morto: 'rosto_5_2',                                // olhos fechados
};
