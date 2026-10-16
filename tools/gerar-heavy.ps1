# ============================================================================
# gerar-heavy.ps1 — prepara a arte nova do HEAVY DOOM METAL (pasta Assets/heavy)
# e grava em public/assets/:
#
#   rosto.png + rosto.json        os 43 rostos do HUD, um frame por rosto (rosto_<linha>_<coluna>)
#   guitarra.png + guitarra.json  a guitarra em primeira pessoa, o raio, o impacto e o ícone
#   logo.png                      o logo do menu, aparado e reduzido
#   fundo-menu.jpg                o fundo fixo do menu (catedrais), no tamanho da tela
#   eddies.png + eddies.json      os inimigos (cabecas do Eddie e o deathbat), em pixel art com a paleta do Doom
#   cenario.png + cenario.json    o ceu da arena (topo da pintura das catedrais)
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

# ============================================================== 4. FUNDO DO MENU
# A pintura das catedrais vira o fundo fixo do menu: reduzida para cobrir a tela inteira
# (960x600) e recortada no excesso de cima e de baixo, sem distorcer.
$L_TELA = 960; $A_TELA = 600
$ALINHAR_Y = 0.35     # que parte da altura sobra: 0 = mostra o topo da pintura, 0.5 = o meio, 1 = a base
$fundo = New-Object System.Drawing.Bitmap (Join-Path $origem 'fundo-menu.png')
$esc = [Math]::Max($L_TELA / $fundo.Width, $A_TELA / $fundo.Height)
$sw = $L_TELA / $esc; $sh = $A_TELA / $esc
$sx = ($fundo.Width - $sw) / 2; $sy = ($fundo.Height - $sh) * $ALINHAR_Y
$tela = Novo-Bitmap $L_TELA $A_TELA
Desenhar $tela $fundo $sx $sy $sw $sh 0 0 $L_TELA $A_TELA
# JPEG: e uma pintura, sem transparencia; fica bem menor que PNG
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$par = New-Object System.Drawing.Imaging.EncoderParameters 1
$par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]88)
$tela.Save((Join-Path $saida 'fundo-menu.jpg'), $jpeg, $par)
"fundo     {0}x{1}" -f $tela.Width, $tela.Height
$tela.Dispose(); $fundo.Dispose()

# ============================================================== 5. INIMIGOS (EDDIES)
# As cabecas do Eddie (Assets/heavy/inimigos) sao ilustracoes em alta resolucao. Para
# combinarem com os sprites do Doom passam por um "tratamento de pixel art":
#   1. reducao: cada cabeca fica com a mesma densidade dos sprites do jogo
#      (64 px por unidade do mundo), entao a altura em px e o tamanho dela no mundo
#   2. paleta: cada pixel vira a cor mais proxima das 256 cores da paleta original do
#      Doom (Assets/...Palette.png, a "Default"). E isso que da a cara de Doom
#   3. borda seca: pixel meio transparente vira opaco ou some (sem borda borrada)
# Cada imagem e uma pose so; as outras sao geradas a partir dela:
#   andar0/1  normal e levemente achatada (balanco ao flutuar)
#   atacar0/1 maior e avermelhada (o bote)
#   dor       avermelhada
#   morrer0-5 se desfazendo: pixels somem, escurecem e caem
$EDDIES = @(
  @{ nome = 'book'; arquivo = 'eddie_book.png'; altura = 52 },        # substitui o Blob
  @{ nome = 'classico'; arquivo = 'eddie.png'; altura = 60 },         # substitui o Lost Soul
  @{ nome = 'powerslave'; arquivo = 'eddie_powerslave.png'; altura = 64 }, # substitui o Ghoul
  @{ nome = 'v2'; arquivo = 'eddie_v2.png'; altura = 104 },           # substitui o Vassago
  @{ nome = '80'; arquivo = 'eddie_80.png'; altura = 166 },           # substitui o Spider Mastermind (chefao)
  @{ nome = 'deathbat'; arquivo = 'avenged.png'; altura = 44 }        # deathbat do Avenged Sevenfold: substitui a Banshee
)

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class PixelArt {
  static byte[] Ler(Bitmap b, out int stride) {
    BitmapData d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    stride = d.Stride; byte[] px = new byte[d.Stride * b.Height];
    Marshal.Copy(d.Scan0, px, 0, px.Length); b.UnlockBits(d); return px;
  }
  static Bitmap Gravar(byte[] px, int w, int h) {
    Bitmap b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    BitmapData d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    Marshal.Copy(px, 0, d.Scan0, px.Length); b.UnlockBits(d); return b;
  }

  // Le a paleta "Default" (grade 16x16 de quadrados de 8 px no canto da sheet).
  public static int[] Paleta(Bitmap sheet, int x0, int y0) {
    int[] cores = new int[256];
    for (int j = 0; j < 16; j++) for (int i = 0; i < 16; i++) {
      Color c = sheet.GetPixel(x0 + i * 8 + 4, y0 + j * 8 + 4);
      cores[j * 16 + i] = (c.R << 16) | (c.G << 8) | c.B;
    }
    return cores;
  }

  // Imagem com fundo branco opaco (o deathbat): apaga o branco que encosta na borda,
  // espalhando a partir das bordas (flood fill). O branco DENTRO do desenho fica.
  public static Bitmap TirarFundoBranco(Bitmap origem) {
    int st; byte[] px = Ler(origem, out st);
    int w = origem.Width, h = origem.Height;
    bool[] visto = new bool[w * h];
    var fila = new Queue<int>();
    for (int x = 0; x < w; x++) { fila.Enqueue(x); fila.Enqueue((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { fila.Enqueue(y * w); fila.Enqueue(y * w + w - 1); }
    while (fila.Count > 0) {
      int p = fila.Dequeue();
      if (visto[p]) continue;
      visto[p] = true;
      int i = (p / w) * st + (p % w) * 4;
      bool claro = px[i + 3] < 20 || (px[i] > 200 && px[i + 1] > 200 && px[i + 2] > 200);
      if (!claro) continue;
      px[i + 3] = 0;
      int x = p % w, y = p / w;
      if (x > 0) fila.Enqueue(p - 1);
      if (x < w - 1) fila.Enqueue(p + 1);
      if (y > 0) fila.Enqueue(p - w);
      if (y < h - 1) fila.Enqueue(p + w);
    }
    return Gravar(px, w, h);
  }

  // Apara a transparencia em volta e reduz para a altura pedida.
  public static Bitmap Reduzir(Bitmap origem, int altura) {
    int st; byte[] px = Ler(origem, out st);
    int x0 = origem.Width, y0 = origem.Height, x1 = -1, y1 = -1;
    for (int y = 0; y < origem.Height; y++) for (int x = 0; x < origem.Width; x++)
      if (px[y * st + x * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    int w = x1 - x0 + 1, h = y1 - y0 + 1;
    int lw = Math.Max(1, (int)Math.Round(w * (double)altura / h));
    Bitmap saida = new Bitmap(lw, altura, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(saida)) {
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.CompositingMode = CompositingMode.SourceCopy;
      g.DrawImage(origem, new Rectangle(0, 0, lw, altura), x0, y0, w, h, GraphicsUnit.Pixel);
    }
    return saida;
  }

  // Leva cada pixel para a cor mais proxima da paleta e deixa a borda seca.
  // contraste > 1 e saturacao > 1 compensam o "lavado" que a reducao deixa.
  public static Bitmap Paletizar(Bitmap origem, int[] paleta, float contraste, float saturacao) {
    int st; byte[] px = Ler(origem, out st);
    var cache = new Dictionary<int, int>();
    for (int i = 0; i < px.Length; i += 4) {
      if (px[i + 3] < 128) { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; continue; }
      float b = px[i] / 255f, g = px[i + 1] / 255f, r = px[i + 2] / 255f;
      float cinza = 0.3f * r + 0.59f * g + 0.11f * b;
      r = cinza + (r - cinza) * saturacao; g = cinza + (g - cinza) * saturacao; b = cinza + (b - cinza) * saturacao;
      r = (r - 0.5f) * contraste + 0.5f; g = (g - 0.5f) * contraste + 0.5f; b = (b - 0.5f) * contraste + 0.5f;
      int R = Math.Max(0, Math.Min(255, (int)(r * 255))), G = Math.Max(0, Math.Min(255, (int)(g * 255))), B = Math.Max(0, Math.Min(255, (int)(b * 255)));
      int chave = (R << 16) | (G << 8) | B, melhor;
      if (!cache.TryGetValue(chave, out melhor)) {
        int menor = int.MaxValue; melhor = 0;
        foreach (int c in paleta) {
          int dr = ((c >> 16) & 255) - R, dg = ((c >> 8) & 255) - G, db = (c & 255) - B;
          int dist = 3 * dr * dr + 4 * dg * dg + 2 * db * db;   // verde pesa mais: o olho e mais sensivel a ele
          if (dist < menor) { menor = dist; melhor = c; }
        }
        cache[chave] = melhor;
      }
      px[i] = (byte)(melhor & 255); px[i + 1] = (byte)((melhor >> 8) & 255); px[i + 2] = (byte)((melhor >> 16) & 255); px[i + 3] = 255;
    }
    return Gravar(px, origem.Width, origem.Height);
  }

  // Tinge na direcao do vermelho (0 = nada, 1 = vermelho puro) e repaletiza.
  public static Bitmap Avermelhar(Bitmap origem, float forca, int[] paleta) {
    int st; byte[] px = Ler(origem, out st);
    for (int i = 0; i < px.Length; i += 4) {
      if (px[i + 3] == 0) continue;
      px[i] = (byte)(px[i] * (1 - forca)); px[i + 1] = (byte)(px[i + 1] * (1 - forca * 0.85f));
      px[i + 2] = (byte)Math.Min(255, px[i + 2] + (255 - px[i + 2]) * forca * 0.5f);
    }
    Bitmap b = Gravar(px, origem.Width, origem.Height);
    Bitmap p = Paletizar(b, paleta, 1f, 1f); b.Dispose(); return p;
  }

  // Redimensiona (sem suavizar) dentro de uma moldura do tamanho `w`x`h`, com a base alinhada.
  public static Bitmap Escalar(Bitmap origem, float ex, float ey, int w, int h) {
    int nw = (int)Math.Round(origem.Width * ex), nh = (int)Math.Round(origem.Height * ey);
    Bitmap saida = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(saida)) {
      g.InterpolationMode = InterpolationMode.NearestNeighbor; g.PixelOffsetMode = PixelOffsetMode.Half;
      g.DrawImage(origem, new Rectangle((w - nw) / 2, (h - nh) / 2, nw, nh), 0, 0, origem.Width, origem.Height, GraphicsUnit.Pixel);
    }
    return saida;
  }

  // Morte: `etapa` de 1 a `total`. Pixels somem ao acaso, os que ficam escurecem e caem.
  public static Bitmap Desfazer(Bitmap origem, int etapa, int total, int semente, int[] paleta) {
    int st; byte[] px = Ler(origem, out st);
    int w = origem.Width, h = origem.Height;
    byte[] saida = new byte[px.Length];
    Random rnd = new Random(semente);
    float sumir = etapa / (float)(total + 1), escurecer = 1f - 0.6f * etapa / total;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int i = y * st + x * 4;
      double sorte = rnd.NextDouble();
      if (px[i + 3] == 0 || sorte < sumir) continue;
      int queda = (int)(etapa * etapa * 0.6 * (0.5 + rnd.NextDouble()));   // cai mais rapido a cada etapa
      int ny = y + queda; if (ny >= h) continue;
      int j = ny * st + x * 4;
      saida[j] = (byte)(px[i] * escurecer * 0.6f); saida[j + 1] = (byte)(px[i + 1] * escurecer * 0.6f);
      saida[j + 2] = (byte)Math.Min(255, px[i + 2] * escurecer + 30); saida[j + 3] = 255;
    }
    Bitmap b = Gravar(saida, w, h);
    Bitmap p = Paletizar(b, paleta, 1f, 1f); b.Dispose(); return p;
  }
}
"@

# paleta Default do Doom: acha o canto da grade (abaixo do titulo "Default")
$folha = New-Object System.Drawing.Bitmap (Join-Path $raiz 'Assets\MS-DOS - DOOM _ DOOM II - Miscellaneous - Palette.png')
$py0 = 10; while ($folha.GetPixel(4, $py0).R -eq 0 -and $folha.GetPixel(4, $py0).G -eq 128) { $py0++ }
$paleta = [PixelArt]::Paleta($folha, 0, $py0); $folha.Dispose()

$frames = @(); $soltar = @(); $ax = 1; $ay = 1; $altLinha = 0; $LARGURA_MAX = 1024
function Guardar($nome, $img) {
  if ($script:ax + $img.Width + 1 -gt $LARGURA_MAX) { $script:ax = 1; $script:ay += $script:altLinha + 1; $script:altLinha = 0 }
  $script:frames += @{ nome = $nome; x = $script:ax; y = $script:ay; w = $img.Width; h = $img.Height; img = $img; sx = 0; sy = 0; sw = $img.Width; sh = $img.Height }
  $script:soltar += $img
  $script:ax += $img.Width + 1
  if ($img.Height -gt $script:altLinha) { $script:altLinha = $img.Height }
}
$semente = 7
foreach ($e in $EDDIES) {
  $orig = New-Object System.Drawing.Bitmap (Join-Path $origem "inimigos\$($e.arquivo)")
  # fundo branco opaco no canto? entao o fundo precisa ser apagado antes
  $canto = $orig.GetPixel(0, 0)
  if ($canto.A -gt 200 -and $canto.R -gt 200 -and $canto.G -gt 200 -and $canto.B -gt 200) { $limpa = [PixelArt]::TirarFundoBranco($orig); $orig.Dispose(); $orig = $limpa }
  $reduzida = [PixelArt]::Reduzir($orig, $e.altura); $orig.Dispose()
  $base = [PixelArt]::Paletizar($reduzida, $paleta, 1.12, 1.15); $reduzida.Dispose()
  # moldura comum, com folga para a pose de ataque (112%), para a animacao nao "pular"
  $mw = [Math]::Ceiling($base.Width * 1.14); $mh = [Math]::Ceiling($base.Height * 1.14)
  $p = "eddies_$($e.nome)"
  Guardar "${p}_andar0" ([PixelArt]::Escalar($base, 1, 1, $mw, $mh))
  Guardar "${p}_andar1" ([PixelArt]::Escalar($base, 1.02, 0.96, $mw, $mh))
  $verm = [PixelArt]::Avermelhar($base, 0.25, $paleta)
  Guardar "${p}_atacar0" ([PixelArt]::Escalar($verm, 1.06, 1.06, $mw, $mh))
  Guardar "${p}_atacar1" ([PixelArt]::Escalar($verm, 1.12, 1.12, $mw, $mh))
  $verm.Dispose()
  $dor = [PixelArt]::Avermelhar($base, 0.5, $paleta)
  Guardar "${p}_dor" ([PixelArt]::Escalar($dor, 1, 1, $mw, $mh)); $dor.Dispose()
  $quadro = [PixelArt]::Escalar($base, 1, 1, $mw, $mh)
  for ($k = 1; $k -le 6; $k++) { Guardar "${p}_morrer$($k - 1)" ([PixelArt]::Desfazer($quadro, $k, 6, $semente + $k, $paleta)) }
  $quadro.Dispose(); $base.Dispose(); $semente += 10
}
$atlas = Novo-Bitmap $LARGURA_MAX ($ay + $altLinha + 1)
foreach ($f in $frames) { Desenhar $atlas $f.img 0 0 $f.w $f.h $f.x $f.y $f.w $f.h -PixelArt }
Gravar-Atlas 'eddies' $atlas $frames
$atlas.Dispose(); foreach ($i in $soltar) { $i.Dispose() }

# ============================================================== 6. CEU DA ARENA
# O ceu da arena e o Assets/heavy/purple_sky.png: nuvens roxas com o rosto do Eddie e rochas
# embaixo. O raycaster desenha 1 px de textura por px de tela na vertical, encostando a base
# da textura no horizonte, e so cabem ~84 linhas acima dele; na horizontal, 320 px a cada
# 90 graus. Entao a imagem inteira e reduzida para CEU_A linhas (um pouco esticada na
# largura) e vira o centro de um tile de 640 px (meia volta: o jogo repete 2 vezes). O resto
# do tile sao as laterais da imagem, so nuvens e rochas, espelhadas em vai-e-volta; onde as
# duas laterais se encontram (atras de quem olha para o rosto) elas se misturam aos poucos.
$CEU_A = 88                 # altura da textura (o que passar de ~84 nunca aparece)
$CEU_RECORTE = 60, 760      # linhas da imagem original usadas [de, ate]: do alto do rosto ao topo das rochas
$CEU_ESTICA = 1.2           # quanto a largura e esticada em relacao a altura
$CEU_ESTICA_LADOS = 2.2     # as laterais esticam mais, para o espelhamento quase nao se repetir
$CEU_ROSTO = 0.31, 0.69     # onde o rosto comeca e termina, em fracao da largura da imagem

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
public static class CeuArte {
  // centro = coluna do tile onde fica o meio da imagem; rostoIni/rostoFim = colunas de s
  // onde o rosto comeca/termina; mistura = meia largura da emenda; passo = tamanho do degrau
  // de cor (reduz a paleta, para combinar com a pixel art do resto do jogo)
  public static Bitmap Panorama(Bitmap s, int largura, int centro, int rostoIni, int rostoFim,
                                int mistura, double esticaLados, double brilho, int passo) {
    int ws = s.Width, h = s.Height, x0 = centro - ws / 2, vao = largura - ws;
    Bitmap saida = new Bitmap(largura + 2, h + 2);
    for (int x = 0; x < largura; x++) {
      int rel = ((x - x0) % largura + largura) % largura;
      int colA, colB = -1; double t = 0;
      if (rel < ws) colA = rel;
      else {
        int dDir = rel - ws, dEsq = largura - 1 - rel, meio = vao / 2;
        colA = Direita((int)(dDir / esticaLados), ws, rostoFim); colB = Esquerda((int)(dEsq / esticaLados), rostoIni);
        double u = (dDir - (meio - mistura)) / (2.0 * mistura);
        t = u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
      }
      for (int y = 0; y < h; y++) {
        Color a = s.GetPixel(colA, y);
        double r = a.R, g = a.G, b = a.B;
        if (colB >= 0 && t > 0) {
          Color c = s.GetPixel(colB, y);
          r += (c.R - r) * t; g += (c.G - g) * t; b += (c.B - b) * t;
        }
        saida.SetPixel(x + 1, y + 1, Color.FromArgb(255, Degrau(r * brilho, passo), Degrau(g * brilho, passo), Degrau(b * brilho, passo)));
      }
    }
    return saida;
  }
  // lateral direita da imagem (so nuvens), indo e voltando a partir da borda direita
  static int Direita(int d, int ws, int fim) {
    int w = ws - fim, k = d / w, o = d % w;
    return k % 2 == 0 ? ws - 1 - o : fim + o;
  }
  // lateral esquerda, indo e voltando a partir da borda esquerda
  static int Esquerda(int d, int ini) {
    int k = d / ini, o = d % ini;
    return k % 2 == 0 ? o : ini - 1 - o;
  }
  static int Degrau(double v, int passo) {
    int q = (int)Math.Round(v / passo) * passo;
    return q < 0 ? 0 : q > 255 ? 255 : q;
  }
}
"@

$quadroCeu = New-Object System.Drawing.Bitmap (Join-Path $origem 'purple_sky.png')
$alturaRecorte = $CEU_RECORTE[1] - $CEU_RECORTE[0]
$larguraS = [Math]::Round($quadroCeu.Width * ($CEU_A / $alturaRecorte) * $CEU_ESTICA)
$reduzido = Novo-Bitmap $larguraS $CEU_A
Desenhar $reduzido $quadroCeu 0 $CEU_RECORTE[0] $quadroCeu.Width $alturaRecorte 0 0 $larguraS $CEU_A
# o jogador comeca olhando para o norte (angulo -90 graus), que cai na coluna 320 do tile
$ceu = [CeuArte]::Panorama($reduzido, 640, 320, [int]($larguraS * $CEU_ROSTO[0]), [int]($larguraS * $CEU_ROSTO[1]), 40, $CEU_ESTICA_LADOS, 0.92, 12)
Gravar-Atlas 'cenario' $ceu @(@{ nome = 'cenario_ceu'; x = 1; y = 1; w = 640; h = $CEU_A })
$ceu.Dispose(); $reduzido.Dispose(); $quadroCeu.Dispose()
