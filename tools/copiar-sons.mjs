// Copia para public/assets/sfx/ só os sons citados em src/data/sons.js, com nomes
// simples (sem espaços nem maiúsculas). A pasta original tem 144 sons; o jogo usa
// uns 40, e não faz sentido publicar o resto. Os MP3 vêm de Assets/heavy/sons.
//
//   npm run sons
import fs from 'node:fs';
import path from 'node:path';
import { PASTA_ORIGEM, PASTA_HEAVY, arquivosDeSom, arquivoWeb } from '../src/data/sons.js';

const DESTINO = 'public/assets/sfx';
fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });

let total = 0, faltando = 0;
for (const nome of arquivosDeSom()) {
  const origem = nome.endsWith('.mp3') ? path.join(PASTA_HEAVY, nome) : path.join(PASTA_ORIGEM, `${nome}.wav`);
  if (!fs.existsSync(origem)) {
    console.error(`FALTA: ${origem}`);
    faltando++;
    continue;
  }
  fs.copyFileSync(origem, path.join(DESTINO, arquivoWeb(nome)));
  total += fs.statSync(origem).size;
}
console.log(`${arquivosDeSom().length - faltando} sons copiados para ${DESTINO} (${(total / 1024).toFixed(0)} KB)`);
if (faltando) process.exit(1);
