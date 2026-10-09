// Banco de sprites do raycaster.
//
// O Phaser desenha texturas pela GPU, mas o raycaster pinta pixel por pixel num
// buffer próprio. Então, depois que o Phaser carrega os atlas, copiamos os pixels
// de cada frame para um Uint32Array (um inteiro por pixel, formato ABGR).
const banco = new Map();

export function carregarAtlasNoBanco(cena, chave) {
  const textura = cena.textures.get(chave);
  const imagem = textura.getSourceImage();
  const canvas = document.createElement('canvas');
  canvas.width = imagem.width;
  canvas.height = imagem.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imagem, 0, 0);
  for (const nome of textura.getFrameNames()) {
    const f = textura.get(nome);
    const dados = ctx.getImageData(f.cutX, f.cutY, f.cutWidth, f.cutHeight);
    banco.set(nome, { nome, w: f.cutWidth, h: f.cutHeight, px: new Uint32Array(dados.data.buffer) });
  }
}

/** Devolve o frame {w, h, px}. Erra alto se o nome não existir: sprite faltando é bug de dados. */
export function quadro(nome) {
  const q = banco.get(nome);
  if (!q) throw new Error(`Sprite inexistente no banco: "${nome}"`);
  return q;
}

/**
 * Converte uma lista de nomes (como as de data/) na lista de frames. O resultado
 * fica guardado por lista, então chamar isto todo quadro não custa nada.
 */
const porLista = new Map();
export function quadrosDe(nomes) {
  let r = porLista.get(nomes);
  if (!r) { r = nomes.map(quadro); porLista.set(nomes, r); }
  return r;
}

export const temQuadro = (nome) => banco.has(nome);
