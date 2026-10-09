// ============================================================================
// recortar.mjs — transforma as sheets do Spriters Resource em atlas do Phaser.
//
//   node tools/recortar.mjs            -> processa todas as sheets do config
//   node tools/recortar.mjs lostsoul   -> só a sheet com esse nome
//
// Para cada sheet de tools/sheets.config.mjs:
//   1. acha os frames (ver os 3 modos abaixo)
//   2. troca a cor de fundo por transparência e apara cada frame no bounding box
//   3. empacota tudo em public/assets/<nome>.png + <nome>.json (JSON Hash do Phaser)
//   4. grava tools/debug/<nome>.png: a sheet original com as caixas e os nomes
//      desenhados por cima, que é o que se abre para conferir o recorte.
//
// Modos de detecção:
//   'celulas'  a sheet tem um fundo "de página" e cada frame fica num retângulo
//              de outra cor (ciano, rosa...). Componente conectado de tudo que
//              NÃO é fundo de página = uma célula. Textos e créditos não têm a
//              cor de célula dentro, então são descartados sozinhos.
//   'blobs'    o sprite está direto sobre o fundo. Componente conectado de
//              pixels opacos = um frame; caixas a menos de `gap` px são fundidas
//              (para explosões e cadáveres feitos de pedacinhos soltos).
//   'regioes'  retângulos escritos à mão no config, para o que não dá para
//              detectar (ex.: um céu, que é um retângulo cheio).
// ============================================================================
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import config from './sheets.config.mjs';

const DIR_ENTRADA = 'Assets';
const DIR_SAIDA = 'public/assets';
const DIR_DEBUG = 'tools/debug';
const MARGEM = 1; // px transparentes entre frames no atlas (evita "sangrar" o vizinho)

// ---------------------------------------------------------------- utilidades

async function carregar(arquivo) {
  const { data, info } = await sharp(path.join(DIR_ENTRADA, arquivo))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Devolve uma função (índice do pixel) -> bool que testa uma lista de cores. */
function testadorDeCor(img, cores, tolerancia = 0) {
  const d = img.data;
  return (p) => {
    const i = p * 4;
    if (d[i + 3] === 0) return cores.includes('transp');
    for (const c of cores) {
      if (c === 'transp') continue;
      if (Math.abs(d[i] - c[0]) <= tolerancia &&
          Math.abs(d[i + 1] - c[1]) <= tolerancia &&
          Math.abs(d[i + 2] - c[2]) <= tolerancia) return true;
    }
    return false;
  };
}

/** Componentes conectados de uma máscara (flood fill iterativo). Devolve caixas. */
function componentes(mascara, w, h, oitoVizinhos) {
  const visto = new Uint8Array(w * h);
  const pilha = new Int32Array(w * h);
  const caixas = [];
  for (let ini = 0; ini < w * h; ini++) {
    if (!mascara[ini] || visto[ini]) continue;
    let topo = 0;
    pilha[topo++] = ini;
    visto[ini] = 1;
    const c = { x0: w, y0: h, x1: -1, y1: -1, area: 0 };
    while (topo > 0) {
      const p = pilha[--topo];
      const x = p % w, y = (p - x) / w;
      c.area++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!oitoVizinhos && dx && dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mascara[q] && !visto[q]) { visto[q] = 1; pilha[topo++] = q; }
        }
      }
    }
    caixas.push(c);
  }
  return caixas;
}

/** Funde caixas que se tocam ou estão a até `gap` px uma da outra. */
function fundir(caixas, gap) {
  const lista = caixas.map(c => ({ ...c }));
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let i = 0; i < lista.length && !mudou; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1) {
          a.x0 = Math.min(a.x0, b.x0); a.y0 = Math.min(a.y0, b.y0);
          a.x1 = Math.max(a.x1, b.x1); a.y1 = Math.max(a.y1, b.y1);
          a.area += b.area;
          lista.splice(j, 1);
          mudou = true;
          break;
        }
      }
    }
  }
  return lista;
}

const dentro = (c, r) => c.x0 >= r.x && c.y0 >= r.y && c.x1 < r.x + r.w && c.y1 < r.y + r.h;

/** Ordem de leitura: agrupa em linhas (por sobreposição vertical) e ordena por x. */
function ordemDeLeitura(caixas) {
  const resto = [...caixas].sort((a, b) => a.y0 - b.y0);
  const linhas = [];
  for (const c of resto) {
    const meio = (c.y0 + c.y1) / 2;
    const linha = linhas.find(l => meio >= l.y0 && meio <= l.y1);
    if (linha) {
      linha.itens.push(c);
    } else {
      linhas.push({ y0: c.y0, y1: c.y1, itens: [c] });
    }
  }
  linhas.forEach(l => l.itens.sort((a, b) => a.x0 - b.x0));
  return linhas;
}

// ------------------------------------------------------------- detecção

/**
 * Corte XY: quando duas células de cores diferentes estão coladas (a sheet de
 * projéteis alterna dois tons de rosa justamente para isso), o componente
 * conectado engloba as duas. Aqui a caixa é dividida na coluna/linha em que a
 * cor de célula troca.
 */
function corteXY(img, caixa, testes) {
  const { w } = img;
  const corDe = (p) => testes.findIndex(t => t(p)); // -1 = pixel de sprite
  const perfil = (porColuna) => {
    const n = porColuna ? caixa.x1 - caixa.x0 + 1 : caixa.y1 - caixa.y0 + 1;
    const m = porColuna ? caixa.y1 - caixa.y0 + 1 : caixa.x1 - caixa.x0 + 1;
    const cores = new Int8Array(n).fill(-1); // -1 nenhuma, -2 mistura, >=0 cor pura
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < m; b++) {
        const x = porColuna ? caixa.x0 + a : caixa.x0 + b;
        const y = porColuna ? caixa.y0 + b : caixa.y0 + a;
        const c = corDe(y * w + x);
        if (c < 0) continue;
        if (cores[a] === -1) cores[a] = c;
        else if (cores[a] !== c) { cores[a] = -2; break; }
      }
    }
    return cores;
  };
  for (const porColuna of [true, false]) {
    const cores = perfil(porColuna);
    let anterior = -1;
    for (let a = 0; a < cores.length; a++) {
      if (cores[a] < 0) { if (cores[a] === -2) anterior = -1; continue; }
      if (anterior >= 0 && cores[a] !== cores[anterior] && a > 0) {
        // achou a troca de cor entre `anterior` e `a`: corta logo antes de `a`
        const um = { ...caixa }, dois = { ...caixa };
        if (porColuna) { um.x1 = caixa.x0 + a - 1; dois.x0 = caixa.x0 + a; }
        else { um.y1 = caixa.y0 + a - 1; dois.y0 = caixa.y0 + a; }
        return [...corteXY(img, um, testes), ...corteXY(img, dois, testes)];
      }
      anterior = a;
    }
  }
  return [caixa];
}

function detectar(img, sheet) {
  const { w, h } = img;
  const n = w * h;
  // `ignorar` (créditos, logos) e `regioes` (recortes manuais) são apagados da
  // máscara, para a detecção automática não enxergar nada ali.
  const manuais = (sheet.regioes || []).map(r => ({ x0: r.x, y0: r.y, x1: r.x + r.w - 1, y1: r.y + r.h - 1, nome: r.nome, cheio: r.cheio, manual: true }));
  if (sheet.modo === 'regioes') return manuais;
  const apagarDaMascara = (mascara) => {
    for (const r of [...(sheet.ignorar || []), ...(sheet.regioes || [])]) {
      for (let y = Math.max(0, r.y); y < Math.min(h, r.y + r.h); y++) mascara.fill(0, y * w + Math.max(0, r.x), y * w + Math.min(w, r.x + r.w));
    }
  };

  if (sheet.modo === 'celulas') {
    const ehPagina = testadorDeCor(img, sheet.fundoPagina, sheet.tolerancia || 0);
    const testes = sheet.fundoCelula.map(c => testadorDeCor(img, [c]));
    const mascara = new Uint8Array(n);
    for (let p = 0; p < n; p++) mascara[p] = ehPagina(p) ? 0 : 1;
    apagarDaMascara(mascara);
    let caixas = componentes(mascara, w, h, false);
    // só é célula o que contém a cor de célula (isso elimina textos e logos)
    caixas = caixas.filter(c => {
      let cont = 0;
      for (let y = c.y0; y <= c.y1; y++) {
        for (let x = c.x0; x <= c.x1; x++) {
          if (testes.some(t => t(y * w + x)) && ++cont >= (sheet.minCorCelula || 12)) return true;
        }
      }
      return false;
    });
    if (testes.length > 1) caixas = caixas.flatMap(c => corteXY(img, c, testes));
    return [...caixas, ...manuais];
  }

  // 'blobs'
  const ehFundo = testadorDeCor(img, sheet.fundo, sheet.tolerancia || 0);
  const mascara = new Uint8Array(n);
  for (let p = 0; p < n; p++) mascara[p] = ehFundo(p) ? 0 : 1;
  apagarDaMascara(mascara);
  let caixas = fundir(componentes(mascara, w, h, true), sheet.gap ?? 2);
  const min = sheet.minArea ?? 12;
  return [...caixas.filter(c => c.area >= min), ...manuais];
}

// ------------------------------------------------------- recorte e atlas

/** Copia a caixa para um buffer RGBA próprio, apagando as cores de fundo, e apara. */
function extrair(img, caixa, sheet) {
  const cores = caixa.cheio ? [] : [
    ...(sheet.fundo || []), ...(sheet.fundoPagina || []), ...(sheet.fundoCelula || []), ...(sheet.apagar || []),
  ];
  const ehFundo = testadorDeCor(img, cores, sheet.tolerancia || 0);
  const cw = caixa.x1 - caixa.x0 + 1, ch = caixa.y1 - caixa.y0 + 1;
  const buf = Buffer.alloc(cw * ch * 4);
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (caixa.y0 + y) * img.w + caixa.x0 + x;
      if (img.data[p * 4 + 3] === 0 || ehFundo(p)) continue;
      img.data.copy(buf, (y * cw + x) * 4, p * 4, p * 4 + 4);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null; // célula vazia
  // aparar:false mantém o tamanho da célula. Serve para sheets em grade uniforme,
  // onde a posição do sprite dentro da célula é o que alinha a animação.
  if (sheet.aparar === false) return { buf, w: cw, h: ch, sx: caixa.x0, sy: caixa.y0 };
  const tw = x1 - x0 + 1, th = y1 - y0 + 1;
  const aparado = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) buf.copy(aparado, y * tw * 4, ((y0 + y) * cw + x0) * 4, ((y0 + y) * cw + x0 + tw) * 4);
  return { buf: aparado, w: tw, h: th, sx: caixa.x0 + x0, sy: caixa.y0 + y0 };
}

/** Empacotamento em prateleiras: simples e suficiente para atlas pequenos. */
function empacotar(frames) {
  const area = frames.reduce((s, f) => s + (f.w + MARGEM) * (f.h + MARGEM), 0);
  const maiorW = Math.max(...frames.map(f => f.w)) + MARGEM * 2;
  const largura = Math.max(maiorW, Math.min(2048, Math.ceil(Math.sqrt(area) * 1.15)));
  const ordem = [...frames].sort((a, b) => b.h - a.h);
  let x = MARGEM, y = MARGEM, altLinha = 0;
  for (const f of ordem) {
    if (x + f.w + MARGEM > largura) { x = MARGEM; y += altLinha + MARGEM; altLinha = 0; }
    f.ax = x; f.ay = y;
    x += f.w + MARGEM;
    altLinha = Math.max(altLinha, f.h);
  }
  return { largura, altura: y + altLinha + MARGEM };
}

async function processar(sheet) {
  const img = await carregar(sheet.arquivo);
  const caixas = detectar(img, sheet);
  const linhas = sheet.modo === 'regioes' ? [{ itens: caixas }] : ordemDeLeitura(caixas);
  // obs.: regiões manuais com `nome` não dependem da posição na ordem de leitura

  const frames = [];
  const usados = new Set();
  linhas.forEach((linha, l) => linha.itens.forEach((caixa, c) => {
    const f = extrair(img, caixa, sheet);
    if (!f) return;
    const chave = `${l}_${c}`;
    let nome = caixa.nome || sheet.nomes?.[chave] || `${sheet.nome}_${chave}`;
    if (sheet.soNomeados && !caixa.nome && !sheet.nomes?.[chave]) nome = null;
    f.chave = chave;
    f.nome = nome;
    f.caixa = caixa;
    if (nome) {
      if (usados.has(nome)) throw new Error(`nome de frame repetido: ${nome}`);
      usados.add(nome);
      frames.push(f);
    } else {
      f.descartado = true;
      frames.push(f);
    }
  }));

  const validos = frames.filter(f => !f.descartado);
  const { largura, altura } = empacotar(validos);
  const json = { frames: {}, meta: { app: 'tools/recortar.mjs', image: `${sheet.nome}.png`, format: 'RGBA8888', size: { w: largura, h: altura }, scale: '1' } };
  for (const f of validos) {
    json.frames[f.nome] = {
      frame: { x: f.ax, y: f.ay, w: f.w, h: f.h },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
      sourceSize: { w: f.w, h: f.h },
    };
  }
  fs.mkdirSync(DIR_SAIDA, { recursive: true });
  await sharp({ create: { width: largura, height: altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(validos.map(f => ({ input: f.buf, raw: { width: f.w, height: f.h, channels: 4 }, left: f.ax, top: f.ay })))
    .png({ compressionLevel: 9 }).toFile(path.join(DIR_SAIDA, `${sheet.nome}.png`));
  fs.writeFileSync(path.join(DIR_SAIDA, `${sheet.nome}.json`), JSON.stringify(json));

  // imagem de conferência: sheet original ampliada + caixas + chave de cada frame
  const E = sheet.escalaDebug || 2;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.w * E}" height="${img.h * E}">`;
  for (const f of frames) {
    const cor = f.descartado ? '#888' : '#ffff00';
    svg += `<rect x="${f.sx * E}" y="${f.sy * E}" width="${f.w * E}" height="${f.h * E}" fill="none" stroke="${cor}" stroke-width="1"/>`;
    svg += `<text x="${f.sx * E + 1}" y="${f.sy * E + 9}" font-family="Arial" font-size="9" font-weight="bold" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${f.chave}</text>`;
  }
  svg += '</svg>';
  fs.mkdirSync(DIR_DEBUG, { recursive: true });
  await sharp(path.join(DIR_ENTRADA, sheet.arquivo)).resize(img.w * E, img.h * E, { kernel: 'nearest' })
    .composite([{ input: Buffer.from(svg) }]).png().toFile(path.join(DIR_DEBUG, `${sheet.nome}.png`));

  console.log(`${sheet.nome.padEnd(12)} ${String(validos.length).padStart(3)} frames  atlas ${largura}x${altura}  (${linhas.length} linhas: ${linhas.map(l => l.itens.length).join(',')})`);
}

const filtro = process.argv[2];
for (const sheet of config) {
  if (filtro && sheet.nome !== filtro) continue;
  await processar(sheet);
}
