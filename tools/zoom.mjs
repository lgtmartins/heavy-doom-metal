// Diagnóstico: recorta uma região de uma sheet, amplia e desenha régua com coordenadas da sheet.
// uso: node tools/zoom.mjs "<trecho do nome>" x y w h escala saida.png [passoGrade]
import sharp from 'sharp';
import fs from 'node:fs';
const [, , trecho, X, Y, W, H, S, saida, P] = process.argv;
const f = fs.readdirSync('Assets').find(f => f.includes(trecho));
const x = +X, y = +Y, s = +S, passo = +(P || 20);
const meta = await sharp(`Assets/${f}`).metadata();
const w = Math.min(+W, meta.width - x), h = Math.min(+H, meta.height - y);
const buf = await sharp(`Assets/${f}`).extract({ left: x, top: y, width: w, height: h })
  .resize(w * s, h * s, { kernel: 'nearest' }).png().toBuffer();
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * s}" height="${h * s}">`;
for (let gx = Math.ceil(x / passo) * passo; gx < x + w; gx += passo) {
  svg += `<line x1="${(gx - x) * s}" y1="0" x2="${(gx - x) * s}" y2="${h * s}" stroke="rgba(255,255,0,0.45)" stroke-width="1"/>`;
  svg += `<text x="${(gx - x) * s + 2}" y="10" font-size="10" fill="#fff" stroke="#000" stroke-width="0.5">${gx}</text>`;
}
for (let gy = Math.ceil(y / passo) * passo; gy < y + h; gy += passo) {
  svg += `<line x1="0" y1="${(gy - y) * s}" x2="${w * s}" y2="${(gy - y) * s}" stroke="rgba(255,255,0,0.45)" stroke-width="1"/>`;
  svg += `<text x="2" y="${(gy - y) * s - 2}" font-size="10" fill="#fff" stroke="#000" stroke-width="0.5">${gy}</text>`;
}
svg += '</svg>';
await sharp(buf).composite([{ input: Buffer.from(svg) }]).png().toFile(saida);
console.log(saida, w * s, h * s);
