# ============================================================================
# gerar-heavy.ps1 — prepara a arte nova do HEAVY DOOM METAL (pasta Assets/heavy)
# e grava em public/assets/:
#
#   rosto.png + rosto.json        os 43 rostos do HUD, um frame por rosto (rosto_<linha>_<coluna>)
#   guitarra.png + guitarra.json  a guitarra em primeira pessoa, o raio, o impacto e o ícone
#   logo.png                      o logo do menu, aparado e reduzido
#
# Roda só com o Windows (PowerShell + System.Drawing), sem Node nem Python:
#   powershell -ExecutionPolicy Bypass -File tools\gerar-heavy.ps1
# Com -Conferir, grava também tools\debug\rosto-conferencia.png (os rostos com o nome por cima).
# ============================================================================
param([switch]$Conferir)
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$raiz = Split-Path $PSScriptRoot -Parent
$origem = Join-Path $raiz 'Assets\heavy'
$saida = Join-Path $raiz 'public\assets'

function Novo-Bitmap($w, $h) {
  return New-Object System.Drawing.Bitmap ([int]$w), ([int]$h), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

# Copia um retangulo de $img para $destino, redimensionando com boa qualidade.
function Desenhar($destino, $img, $sx, $sy, $sw, $sh, $dx, $dy, $dw, $dh, [switch]$PixelArt) {
  $g = [System.Drawing.Graphics]::FromImage($destino)
  if ($PixelArt) { $g.InterpolationMode = 'NearestNeighbor' } else { $g.InterpolationMode = 'HighQualityBicubic' }
  $g.PixelOffsetMode = 'Half'
  $g.CompositingMode = 'SourceCopy'
  $alvo = New-Object System.Drawing.Rectangle ([int]$dx), ([int]$dy), ([int]$dw), ([int]$dh)
  $g.DrawImage($img, $alvo, [int]$sx, [int]$sy, [int]$sw, [int]$sh, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
}

# Grava o JSON de atlas no formato "JSON Hash" do Phaser. $frames = lista de @{ nome; x; y; w; h }
function Gravar-Atlas($nome, $bitmap, $frames) {
  $bitmap.Save((Join-Path $saida "$nome.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $partes = foreach ($f in $frames) {
    '"{0}":{{"frame":{{"x":{1},"y":{2},"w":{3},"h":{4}}},"rotated":false,"trimmed":false,"spriteSourceSize":{{"x":0,"y":0,"w":{3},"h":{4}}},"sourceSize":{{"w":{3},"h":{4}}}}}' -f $f.nome, $f.x, $f.y, $f.w, $f.h
  }
  $json = '{"frames":{' + ($partes -join ',') + '},"meta":{"app":"tools/gerar-heavy.ps1","image":"' + $nome + '.png","format":"RGBA8888","size":{"w":' + $bitmap.Width + ',"h":' + $bitmap.Height + '},"scale":"1"}}'
  [System.IO.File]::WriteAllText((Join-Path $saida "$nome.json"), $json, (New-Object System.Text.UTF8Encoding $false))
  "{0,-9} {1,3} frames  atlas {2}x{3}" -f $nome, $frames.Count, $bitmap.Width, $bitmap.Height
}

# ============================================================== 1. ROSTOS
# A sheet tem 6 linhas de rostos sobre fundo preto. As linhas sao faceis de achar
# (ha uma faixa preta entre elas), mas os cabelos de rostos vizinhos se encostam,
# entao as colunas sao cortadas no ponto mais "vazio" perto de onde o corte
# deveria cair se os rostos tivessem todos a mesma largura.
$ROSTOS_POR_LINHA = 8, 8, 8, 7, 8, 3
$ALTURA_ROSTO = 78          # altura final de cada rosto, em px (o tamanho exibido no HUD)

$face = New-Object System.Drawing.Bitmap (Join-Path $origem 'face.png')
$ret = New-Object System.Drawing.Rectangle 0, 0, $face.Width, $face.Height
$dados = $face.LockBits($ret, 'ReadOnly', 'Format32bppArgb')
$px = New-Object byte[] ($dados.Stride * $face.Height)
[System.Runtime.InteropServices.Marshal]::Copy($dados.Scan0, $px, 0, $px.Length)
$passo = $dados.Stride
$face.UnlockBits($dados)
$fw = $face.Width; $fh = $face.Height

# "Tem conteudo" = pixel que nao e o preto do fundo (soma R+G+B > 70). O teste fica
# escrito por extenso dentro dos lacos: chamar uma funcao por pixel no PowerShell
# deixa o script minutos mais lento.

# faixas verticais (linhas de rostos)
$linhas = @(); $ini = -1
for ($y = 0; $y -lt $fh; $y++) {
  $c = 0; $o = $y * $passo
  for ($x = 0; $x -lt $fw; $x += 2) { $p = $o + $x * 4; if (($px[$p] + $px[$p + 1] + $px[$p + 2]) -gt 70) { $c++ } }
  if ($c -gt 3) { if ($ini -lt 0) { $ini = $y } }
  elseif ($ini -ge 0) { if ($y - $ini -gt 40) { $linhas += , @($ini, ($y - 1)) }; $ini = -1 }
}
if ($ini -ge 0) { $linhas += , @($ini, ($fh - 1)) }
if ($linhas.Count -ne $ROSTOS_POR_LINHA.Count) { throw "Esperava $($ROSTOS_POR_LINHA.Count) linhas de rostos, achei $($linhas.Count)" }

$celulas = @()
for ($l = 0; $l -lt $linhas.Count; $l++) {
  $y0 = $linhas[$l][0]; $y1 = $linhas[$l][1]; $n = $ROSTOS_POR_LINHA[$l]
  $cols = New-Object int[] $fw
  for ($y = $y0; $y -le $y1; $y++) {
    $o = $y * $passo
    for ($x = 0; $x -lt $fw; $x++) { $p = $o + $x * 4; if (($px[$p] + $px[$p + 1] + $px[$p + 2]) -gt 70) { $cols[$x]++ } }
  }
  $x0 = 0; while ($x0 -lt $fw -and $cols[$x0] -le 1) { $x0++ }
  $x1 = $fw - 1; while ($x1 -gt 0 -and $cols[$x1] -le 1) { $x1-- }
  $cortes = @($x0)
  for ($k = 1; $k -lt $n; $k++) {
    # o corte k fica no minimo do perfil, numa janela em volta da posicao "media"
    # (medida a partir do corte anterior, para rostos mais largos nao acumularem erro)
    $esperado = $cortes[-1] + ($x1 - $cortes[-1]) / ($n - $k + 1)
    $melhor = [int]$esperado; $menor = [int]::MaxValue
    for ($x = [int]($esperado - 34); $x -le [int]($esperado + 34); $x++) {
      if ($x -le $cortes[-1] + 60 -or $x -ge $x1) { continue }
      $v = $cols[$x - 1] + $cols[$x] + $cols[$x + 1]
      if ($v -lt $menor) { $menor = $v; $melhor = $x }
    }
    $cortes += $melhor
  }
  $cortes += ($x1 + 1)
  for ($k = 0; $k -lt $n; $k++) {
    $celulas += @{ nome = "rosto_${l}_$k"; sx = $cortes[$k]; sy = $y0; sw = $cortes[$k + 1] - $cortes[$k]; sh = $y1 - $y0 + 1 }
  }
}

# monta o atlas: todos com a mesma altura, lado a lado, uma linha do atlas por linha da sheet
$margem = 1; $ax = $margem; $ay = $margem; $largura = 0; $linhaAtual = 0
foreach ($c in $celulas) {
  $l = [int]($c.nome.Split('_')[1])
  if ($l -ne $linhaAtual) { $linhaAtual = $l; $ax = $margem; $ay += $ALTURA_ROSTO + $margem }
  $c.w = [int][Math]::Round($c.sw * $ALTURA_ROSTO / $c.sh); $c.h = $ALTURA_ROSTO; $c.x = $ax; $c.y = $ay
  $ax += $c.w + $margem
  if ($ax -gt $largura) { $largura = $ax }
}
$atlas = Novo-Bitmap $largura ($ay + $ALTURA_ROSTO + $margem)
foreach ($c in $celulas) { Desenhar $atlas $face $c.sx $c.sy $c.sw $c.sh $c.x $c.y $c.w $c.h }
Gravar-Atlas 'rosto' $atlas $celulas

if ($Conferir) {
  $dbg = Join-Path $raiz 'tools\debug'
  New-Item -ItemType Directory -Force $dbg | Out-Null
  $conf = Novo-Bitmap ($atlas.Width * 2) ($atlas.Height * 2)
  Desenhar $conf $atlas 0 0 $atlas.Width $atlas.Height 0 0 $conf.Width $conf.Height
  $g = [System.Drawing.Graphics]::FromImage($conf)
  $fonte = New-Object System.Drawing.Font 'Arial', 11, ([System.Drawing.FontStyle]::Bold)
  foreach ($c in $celulas) {
    $rotulo = $c.nome.Replace('rosto_', '')
    $g.FillRectangle([System.Drawing.Brushes]::Black, $c.x * 2, $c.y * 2, 34, 17)
    $g.DrawString($rotulo, $fonte, [System.Drawing.Brushes]::Yellow, $c.x * 2, $c.y * 2)
    $g.DrawRectangle([System.Drawing.Pens]::DimGray, $c.x * 2, $c.y * 2, $c.w * 2, $c.h * 2)
  }
  $g.Dispose()
  $conf.Save((Join-Path $dbg 'rosto-conferencia.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $conf.Dispose()
}
$atlas.Dispose(); $face.Dispose()

# ============================================================== 2. GUITARRA
# Os frames ja vem recortados e com fundo transparente. A arte original tem o raio
# AZUL; as outras cores sao geradas aqui, trocando o matiz (a "cor" no circulo
# cromatico) so dos pixels eletricos (azulados e saturados). A madeira, as
# tarraxas e a mao nao mudam, porque nao sao azuis.
#
# Frames gerados, para cada cor:  guitarra_<pose>_<cor>
#   poses: charge, fire1, fire2, recoil (a guitarra), beam1-3 (o raio), hit1-3 (o impacto), icone
# Mais 'guitarra_idle', a guitarra parada, que nao tem raio e serve para todas as cores.
#
#   matiz  0 = vermelho, 55 = amarelo, 120 = verde, 285 = roxo ...; -1 = nao mexer (o azul original)
#   branco = em vez de trocar o matiz, tira quase toda a cor
$CORES = @(
  @{ nome = 'azul'; matiz = -1 },
  @{ nome = 'verde'; matiz = 120 },
  @{ nome = 'amarelo'; matiz = 52 },
  @{ nome = 'vermelho'; matiz = 2 },
  @{ nome = 'roxo'; matiz = 285 },
  @{ nome = 'branco'; matiz = -2 }
)

# O laco por pixel e escrito em C# e compilado na hora: em PowerShell puro levaria minutos.
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class Tinta {
  // Devolve uma copia de `origem` com os pixels eletricos (matiz entre 165 e 270 graus,
  // saturacao > 0.22) repintados: matiz >= 0 troca a cor; matiz == -2 deixa quase branco.
  public static Bitmap Recolorir(Bitmap origem, float matiz) {
    int w = origem.Width, h = origem.Height;
    Bitmap saida = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    Rectangle r = new Rectangle(0, 0, w, h);
    BitmapData a = origem.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    BitmapData b = saida.LockBits(r, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    byte[] px = new byte[a.Stride * h];
    Marshal.Copy(a.Scan0, px, 0, px.Length);
    for (int i = 0; i < px.Length; i += 4) {
      if (px[i + 3] == 0 || matiz == -1f) continue;
      float bb = px[i] / 255f, gg = px[i + 1] / 255f, rr = px[i + 2] / 255f;
      float max = Math.Max(rr, Math.Max(gg, bb)), min = Math.Min(rr, Math.Min(gg, bb)), d = max - min;
      if (max <= 0f || d / max < 0.22f) continue;            // cinza/branco/preto: nao e raio colorido
      float hh;
      if (max == rr) hh = 60f * (((gg - bb) / d) % 6f);
      else if (max == gg) hh = 60f * ((bb - rr) / d + 2f);
      else hh = 60f * ((rr - gg) / d + 4f);
      if (hh < 0f) hh += 360f;
      if (hh < 165f || hh > 270f) continue;                  // nao e azulado: madeira, pele...
      float s = d / max, v = max;
      if (matiz == -2f) { s *= 0.10f; v = Math.Min(1f, v * 1.12f); hh = 210f; } else hh = matiz;
      float c = v * s, x = c * (1f - Math.Abs((hh / 60f) % 2f - 1f)), m = v - c;
      float r1, g1, b1;
      if (hh < 60f) { r1 = c; g1 = x; b1 = 0f; } else if (hh < 120f) { r1 = x; g1 = c; b1 = 0f; }
      else if (hh < 180f) { r1 = 0f; g1 = c; b1 = x; } else if (hh < 240f) { r1 = 0f; g1 = x; b1 = c; }
      else if (hh < 300f) { r1 = x; g1 = 0f; b1 = c; } else { r1 = c; g1 = 0f; b1 = x; }
      px[i] = (byte)Math.Round((b1 + m) * 255f);
      px[i + 1] = (byte)Math.Round((g1 + m) * 255f);
      px[i + 2] = (byte)Math.Round((r1 + m) * 255f);
    }
    Marshal.Copy(px, 0, b.Scan0, px.Length);
    origem.UnlockBits(a); saida.UnlockBits(b);
    return saida;
  }

  // Devolve uma copia de `origem` com `extra` linhas a mais embaixo, nas quais o BRACO DA
  // GUITARRA continua. Na arte original o braco da guitarra e cortado reto na ultima linha;
  // aqui os pixels dele (os opacos a partir da coluna `xBraco`, que ficam a direita da
  // munhequeira) sao repetidos para baixo, acompanhando a inclinacao do braco
  // (`inclinacao` = quantos px ele anda para a direita a cada linha).
  // As linhas copiadas vao e voltam entre as 6 ultimas, para a madeira nao virar listras.
  public static Bitmap Alongar(Bitmap origem, int extra, int xBraco, float inclinacao) {
    int w = origem.Width, h = origem.Height;
    Bitmap saida = new Bitmap(w, h + extra, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(saida)) { g.DrawImageUnscaled(origem, 0, 0); }
    for (int k = 1; k <= extra; k++) {
      int ciclo = (k - 1) % 10;
      int fonte = h - 1 - (ciclo < 6 ? ciclo : 10 - ciclo);
      int desloc = (int)Math.Round(k * inclinacao);
      for (int x = xBraco; x < w; x++) {
        Color c = origem.GetPixel(x, fonte);
        if (c.A < 20) continue;
        int dx = x + desloc;
        if (dx < w) saida.SetPixel(dx, h - 1 + k, c);
      }
    }
    return saida;
  }
}
"@

$pasta = Join-Path $origem 'guitarra_raio_frames'
$poses = 'charge', 'fire1', 'fire2', 'recoil', 'beam1', 'beam2', 'beam3', 'hit1', 'hit2', 'hit3'
$originais = @{}
foreach ($n in @('idle') + $poses) { $originais[$n] = New-Object System.Drawing.Bitmap (Join-Path $pasta "guitarra_$n.png") }

# Alonga o braco da guitarra nas 5 poses (ver Tinta.Alongar). Sem isso, com a guitarra
# deitada na tela, o braco aparecia serrado logo depois da mao.
$EXTRA = 90          # linhas a mais embaixo
$X_BRACO = 122       # coluna onde, na ultima linha da arte, acaba a munhequeira e comeca o braco da guitarra
$INCLINACAO = 0.2    # o braco da guitarra anda 0,2 px para a direita a cada linha
$ALT_G = 220 + $EXTRA
foreach ($n in 'idle', 'charge', 'fire1', 'fire2', 'recoil') {
  $longa = [Tinta]::Alongar($originais[$n], $EXTRA, $X_BRACO, $INCLINACAO)
  $originais[$n].Dispose(); $originais[$n] = $longa
}

$TAM_ICONE = 20
$frames = @(); $descartar = @()
# linha 0 do atlas: so a guitarra parada; depois uma linha por cor
$frames += @{ nome = 'guitarra_idle'; x = 1; y = 1; w = 160; h = $ALT_G; img = $originais['idle']; sx = 0; sy = 0; sw = 160; sh = $ALT_G; pixelArt = $true }
$larguraLinha = 0; $ay = 1
foreach ($cor in $CORES) {
  $ax = 163
  if ($cor.nome -ne 'azul') { $ax = 1; $ay += $ALT_G + 2 }
  foreach ($n in $poses) {
    $img = [Tinta]::Recolorir($originais[$n], [float]$cor.matiz); $descartar += $img
    $frames += @{ nome = "guitarra_${n}_$($cor.nome)"; x = $ax; y = $ay; w = $img.Width; h = $img.Height; img = $img; sx = 0; sy = 0; sw = $img.Width; sh = $img.Height; pixelArt = $true }
    $ax += $img.Width + 1
    # icone da cor: a faisca maior do impacto (hit2, regiao 9..47 x 8..46), reduzida
    if ($n -eq 'hit2') { $icone = @{ nome = "guitarra_icone_$($cor.nome)"; w = $TAM_ICONE; h = $TAM_ICONE; img = $img; sx = 9; sy = 8; sw = 40; sh = 40; pixelArt = $false } }
  }
  $icone.x = $ax; $icone.y = $ay; $frames += $icone; $ax += $TAM_ICONE + 1
  if ($ax -gt $larguraLinha) { $larguraLinha = $ax }
}
$atlas = Novo-Bitmap $larguraLinha ($ay + $ALT_G + 2)
foreach ($f in $frames) {
  if ($f.pixelArt) { Desenhar $atlas $f.img $f.sx $f.sy $f.sw $f.sh $f.x $f.y $f.w $f.h -PixelArt }
  else { Desenhar $atlas $f.img $f.sx $f.sy $f.sw $f.sh $f.x $f.y $f.w $f.h }
}
Gravar-Atlas 'guitarra' $atlas $frames
$atlas.Dispose(); foreach ($i in $originais.Values) { $i.Dispose() }; foreach ($i in $descartar) { $i.Dispose() }
# ============================================================== 3. LOGO
# Apara as margens transparentes e reduz para 300 px de altura (o tamanho usado no menu).
$logo = New-Object System.Drawing.Bitmap (Join-Path $origem 'menu.png')
$ret = New-Object System.Drawing.Rectangle 0, 0, $logo.Width, $logo.Height
$dados = $logo.LockBits($ret, 'ReadOnly', 'Format32bppArgb')
$lp = New-Object byte[] ($dados.Stride * $logo.Height)
[System.Runtime.InteropServices.Marshal]::Copy($dados.Scan0, $lp, 0, $lp.Length)
$ls = $dados.Stride
$logo.UnlockBits($dados)
$x0 = $logo.Width; $y0 = $logo.Height; $x1 = -1; $y1 = -1
for ($y = 0; $y -lt $logo.Height; $y++) {
  $o = $y * $ls + 3
  for ($x = 0; $x -lt $logo.Width; $x++) {
    if ($lp[$o + $x * 4] -gt 20) { if ($x -lt $x0) { $x0 = $x }; if ($x -gt $x1) { $x1 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($y -gt $y1) { $y1 = $y } }
  }
}
$lw = $x1 - $x0 + 1; $lh = $y1 - $y0 + 1
$ALTURA_LOGO = 300
$final = Novo-Bitmap ([Math]::Round($lw * $ALTURA_LOGO / $lh)) $ALTURA_LOGO
Desenhar $final $logo $x0 $y0 $lw $lh 0 0 $final.Width $final.Height
$final.Save((Join-Path $saida 'logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
"logo      {0}x{1}" -f $final.Width, $final.Height
$final.Dispose(); $logo.Dispose()
