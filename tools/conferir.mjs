// Conferência do resultado: desenha um atlas gerado sobre fundo xadrez (para a
// transparência aparecer) em tools/debug/atlas-<nome>.png.
//   node tools/conferir.mjs vassago [escala]
import sharp from 'sharp';
const [, , nome, esc = '1'] = process.argv;
const E = +esc;
const m = await sharp(`public/assets/${nome}.png`).metadata();
const W = m.width * E, H = m.height * E;
const xadrez = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#3a3a44"/><rect width="8" height="8" fill="#55556a"/><rect x="8" y="8" width="8" height="8" fill="#55556a"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
const img = await sharp(`public/assets/${nome}.png`).resize(W, H, { kernel: 'nearest' }).toBuffer();
await sharp(Buffer.from(xadrez)).composite([{ input: img }]).png().toFile(`tools/debug/atlas-${nome}.png`);
console.log(`tools/debug/atlas-${nome}.png ${W}x${H}`);
