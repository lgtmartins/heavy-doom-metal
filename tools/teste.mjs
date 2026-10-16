// Teste de fumaça LEVE: sobe o Vite, abre o jogo num navegador headless (Edge ou
// Chrome já instalados, via playwright-core), joga alguns segundos e acusa
// qualquer erro de console.
//
//   node tools/teste.mjs            -> menu + ~6 s de jogo             (~15 s no total)
//   node tools/teste.mjs telas      -> cartas, pausa, chefão, fim, reinício (~40 s)
//
// Feito para não castigar a máquina:
//   - um único servidor e um único navegador, em 800x600;
//   - antes de começar, encerra sobras de execuções anteriores;
//   - sempre fecha tudo no fim (mesmo com erro) e tem um limite de tempo global;
//   - NÃO faz teste de estresse nem joga a run inteira: desempenho e
//     balanceamento se testam jogando, com `npm run dev`.
//
// As capturas vão para tools/debug/teste-*.png.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const cenario = process.argv[2] || 'fumaca';
const PORTA = 5199;
const LIMITE_MS = cenario === 'telas' ? 90000 : 45000;
fs.mkdirSync('tools/debug', { recursive: true });

/** Encerra navegadores headless e outras execuções deste script que tenham ficado para trás (só Windows). */
function encerrarOrfaos() {
  if (process.platform !== 'win32') return;
  const filtro = `($_.Name -match '^(msedge|chrome)\\.exe$' -and $_.CommandLine -match '--headless') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'teste\\.mjs' -and $_.ProcessId -ne ${process.pid})`;
  try {
    execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ${filtro} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
  } catch { /* nada para encerrar */ }
}

encerrarOrfaos();
let servidor = null, navegador = null;
const erros = [];

async function fecharTudo() {
  if (navegador) await navegador.close().catch(() => {});
  if (servidor) await servidor.close().catch(() => {});
  navegador = servidor = null;
}
// Trava de segurança: se algo pendurar, fecha tudo e sai.
const limite = setTimeout(async () => {
  console.error(`Tempo limite de ${LIMITE_MS / 1000}s estourado: encerrando.`);
  await fecharTudo();
  encerrarOrfaos();
  process.exit(3);
}, LIMITE_MS);

try {
  servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
  await servidor.listen();
  for (const channel of ['msedge', 'chrome']) {
    try { navegador = await chromium.launch({ channel, headless: true }); break; } catch { /* tenta o próximo */ }
  }
  if (!navegador) throw new Error('Nenhum Edge/Chrome encontrado.');

  const pagina = await navegador.newPage({ viewport: { width: 800, height: 600 } });
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`[${m.type()}] ${m.text()}`); });
  pagina.on('pageerror', (e) => erros.push(`[excecao] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));

  const foto = (nome) => pagina.screenshot({ path: `tools/debug/teste-${nome}.png` });
  const espera = (ms) => pagina.waitForTimeout(ms);
  const cenas = () => pagina.evaluate(() => window.__phaser.scene.getScenes(true).map(s => s.scene.key).join(','));
  const estado = () => pagina.evaluate(() => {
    const j = window.__doom;
    if (!j) return null;
    return { t: +j.stats.tempo.toFixed(1), fase: j.diretor.fase, vivos: j.horda.vivos, vida: Math.round(j.jogador.vida), nivel: j.jogador.nivel, fim: j.fim };
  });
  const conferir = async (rotulo, esperado) => {
    const atual = await cenas();
    console.log(`${atual === esperado ? 'ok  ' : 'FALHA'} ${rotulo}: ${atual}`);
    if (atual !== esperado) erros.push(`[fluxo] ${rotulo}: esperava "${esperado}", veio "${atual}"`);
  };

  await pagina.goto(`http://localhost:${PORTA}/?debug`);
  await pagina.waitForFunction(() => window.__phaser && window.__phaser.scene.isActive('Menu'), null, { timeout: 20000 });
  await espera(300);
  await foto('menu');
  await conferir('menu', 'Menu');
  // as duas telas internas do menu: entra, fotografa e volta com ESC
  for (const [descidas, nome] of [[1, 'como-jogar'], [2, 'records'], [3, 'creditos']]) {
    await espera(450);
    for (let i = 0; i < descidas; i++) { await pagina.keyboard.press('ArrowDown'); await espera(60); }
    await pagina.keyboard.press('Enter');
    await espera(450);
    await foto(`menu-${nome}`);
    await pagina.keyboard.press('Escape');
  }
  await espera(450);
  await conferir('menu (voltou)', 'Menu');
  await pagina.keyboard.press('Enter');
  await pagina.waitForFunction(() => window.__doom, null, { timeout: 8000 });
  await espera(800);
  await conferir('jogo', 'Jogo,Hud');

  if (cenario === 'fumaca') {
    // anda e atira por alguns segundos: tempo de a onda 1 começar
    await pagina.keyboard.down('w');
    await pagina.evaluate(() => { window.__doom.entrada.atirando = true; });
    await espera(4500);
    await pagina.keyboard.up('w');
    await foto('jogo');
    console.log('estado', JSON.stringify(await estado()));
    // os riffs do level-up são MP3 (os outros sons são WAV): confere se decodificaram
    const riffs = await pagina.evaluate(() => ['eric-andre-guitar-riff.mp3', 'rokytshred.mp3']
      .map(n => `${n}: ${window.__sons?.amostras[n] ? window.__sons.amostras[n].duration.toFixed(1) + 's' : 'NÃO decodificado'}`));
    console.log('riffs', riffs.join('  ·  '));
  }

  if (cenario === 'telas') {
    const escolherCarta = () => pagina.evaluate(() => { const c = window.__phaser.scene.getScene('Cartas'); if (c.scene.isActive() && !c.escolhida) { c.liberada = true; c.escolher(0); } });
    // ---- level-up
    await pagina.evaluate(() => { const j = window.__doom; j.deus = true; j.diretor.fase = 'fim'; j.jogador.ganharXp(j.jogador.xpProx); });
    await espera(400);
    await foto('cartas');
    await conferir('cartas', 'Hud,Cartas');
    await escolherCarta();
    await espera(300);
    await conferir('voltou das cartas', 'Jogo,Hud');
    // ---- pausa
    await pagina.keyboard.press('p');
    await espera(400);
    await foto('pausa');
    await conferir('pausa', 'Hud,Pausa');
    await pagina.keyboard.press('p');
    await espera(300);
    await conferir('voltou da pausa', 'Jogo,Hud');
    // ---- um inimigo de cada tipo, parados, e o chefão
    await pagina.evaluate(() => {
      const j = window.__doom, jog = j.jogador;
      jog.x = 22; jog.y = 27; jog.ang = -Math.PI / 2;
      ['blob', 'lostsoul', 'banshee', 'ghoul', 'vassago'].forEach((t, i) => {
        const e = j.horda.criar(t, 19.4 + i * 1.3, 23.2 - (i % 2) * 0.9);
        e.def = { ...e.def, vel: 0, ia: 'perseguidor', ataque: { dano: 0, alcance: 0, intervalo: 9 } };
      });
    });
    await espera(900);
    await foto('inimigos');
    await pagina.evaluate(() => { const j = window.__doom; j.horda.danoEmArea(22, 22, 99, 99999); j.diretor.nascerChefe(); });
    await espera(1500);
    await foto('chefe');
    await pagina.evaluate(() => { const j = window.__doom; j.horda.danoEmArea(j.horda.chefe.x, j.horda.chefe.y, 3, 999999); });
    await pagina.waitForFunction(() => window.__phaser.scene.isActive('Fim'), null, { timeout: 10000 });
    await escolherCarta();
    await espera(400);
    await foto('vitoria');
    await conferir('vitória', 'Fim');
    // ---- reiniciar, morrer, voltar ao menu
    await pagina.keyboard.press('Enter');
    await pagina.waitForFunction(() => window.__doom && window.__doom.stats.tempo < 2, null, { timeout: 8000 });
    await espera(400);
    await conferir('reiniciou', 'Jogo,Hud');
    await pagina.evaluate(() => { window.__doom.jogador.ferir(9999, 0, 0, 'Teste'); });
    await pagina.waitForFunction(() => window.__phaser.scene.isActive('Fim'), null, { timeout: 8000 });
    await espera(500);
    await foto('derrota');
    await conferir('derrota', 'Fim');
    await pagina.keyboard.press('ArrowDown');
    await espera(100);
    await pagina.keyboard.press('Enter');
    await espera(500);
    await conferir('menu de novo', 'Menu');
  }
} catch (e) {
  erros.push(`[teste] ${e.message}`);
} finally {
  clearTimeout(limite);
  await fecharTudo();
  encerrarOrfaos();
}

console.log(erros.length ? `\n${erros.length} ERRO(S):\n${[...new Set(erros)].slice(0, 15).join('\n')}` : '\nSem erros.');
process.exit(erros.length ? 1 : 0);
