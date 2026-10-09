# ASSETS — o que existe, como foi recortado e onde é usado

As sheets originais (The Spriters Resource) ficam em `Assets/` e **não são usadas diretamente pelo jogo**.
O script `tools/recortar.mjs` lê cada sheet, remove o fundo, detecta os frames e grava um atlas
(`.png` + `.json` no formato JSON Hash do Phaser) em `public/assets/`.

```bash
npm run assets                 # refaz todos os atlas
node tools/recortar.mjs fx     # refaz só um
node tools/conferir.mjs fx 2   # desenha o atlas sobre fundo xadrez em tools/debug/atlas-fx.png
```

A cada execução o script também grava `tools/debug/<nome>.png`: a sheet original com a caixa e a
**chave** de cada frame desenhadas por cima. É por essa imagem que se descobre o nome de um frame.

## Como os frames são nomeados

`<atlas>_<linha>_<coluna>`, em ordem de leitura (linhas de cima para baixo, colunas da esquerda
para a direita), começando em 0. Exemplo: `lostsoul_3_0` é o primeiro frame da 4ª linha da sheet do
Lost Soul. Alguns recortes manuais têm nome próprio (`vassago_morte_0`, `hud_num_7`, `sky_inferno`).

## Os três modos de detecção (`tools/sheets.config.mjs`)

| Modo | Quando serve | Como funciona |
|---|---|---|
| `celulas` | Cada frame está num retângulo colorido sobre um fundo "de página" (sheets do Dolphman, Ghoul, Banshee, efeitos) | Componente conectado de tudo que **não** é fundo de página = uma célula. Só vale se contiver a cor de célula, o que descarta textos e logos sozinho. Se duas células de cores diferentes estiverem coladas (a sheet de efeitos alterna dois rosas), um **corte XY** separa onde a cor troca. |
| `blobs` | Sprite direto sobre o fundo (Vassago, Spider Mastermind, Blob, itens, céus) | Componente conectado (8 vizinhos) de pixels opacos = um frame. `gap` funde caixas próximas; `minArea` descarta letras. |
| `regioes` | O que não dá para detectar (HUD emoldurado, morte do Vassago feita de pedacinhos) | Retângulos escritos à mão. |

`ignorar` apaga regiões (créditos) antes da detecção; `aparar: false` mantém o tamanho da célula
quando é a grade que alinha a animação (Ghoul, Banshee, dígitos do HUD).

### Correções feitas depois da conferência visual

- **Vassago**: com qualquer `gap` > 0 os sprites vizinhos se fundiam; ficou `gap: 0`. A linha de
  morte (chamas e crânio soltos) virou 8 regiões manuais, e o 8º ângulo das duas primeiras linhas é
  ignorado porque os sprites se encostam.
- **Spider Mastermind / Blob**: o texto de créditos encostava nos sprites; virou `ignorar`.
- **Ghoul**: em `blobs` os raios elétricos viravam frames separados; passou para `celulas`.
- **Itens**: as letras dos títulos viravam frames; `minArea: 45` resolve.
- **HUD**: os dígitos não estão numa grade uniforme (o "1" é mais estreito); as posições foram
  medidas pela projeção de colunas.

## Inimigos

Os monstros do Doom têm sprites para 5 ângulos (8 com espelhamento). O jogo é em **primeira pessoa**
e todo inimigo está sempre perseguindo o jogador, portanto de frente para a câmera: só os frames
**frontais** (coluna 0 de cada linha) são usados. Os outros ângulos continuam nos atlas.

| Atlas | Origem | Uso no jogo | Andar | Atacar | Dor | Morrer |
|---|---|---|---|---|---|---|
| `blob` | id Vault — "The Blob" (não usado no jogo original) | **Blob**: enxame fraco, corpo a corpo | 3 (`1_0..1_2`) | — | — | sem frames: usa a explosão `fx_2_2..2_4` |
| `lostsoul` | Enemies — Lost Soul | **Lost Soul**: investida em linha reta | 2 (`0_0`, `2_0`) | 2 (`3_0`, `4_0`) | 1 (`5_0`) | 6 (`6_0..6_5`) |
| `banshee` | Legacy of Rust — Banshee | **Banshee**: kamikaze, explode | 4 (`0_0..0_3`) | — (pisca no pavio) | — | 4 (`1_0..1_3`) |
| `ghoul` | Legacy of Rust — Ghoul | **Ghoul**: voa, mantém distância e atira | 3 (`0_0..0_2`) | 4 (`0_3..0_6`) | 1 (`0_8`) | 8 (`5_0..5_7`), o último vira cadáver |
| `vassago` | Legacy of Rust — Vassago | **Vassago**: tanque, bolas de fogo que queimam o chão | 4 (`0_0..3_0`) | 4 (`4_0..7_0`) | 1 (`8_0`) | 8 (`vassago_morte_0..7`), o último vira cadáver |
| `spider` | id Vault — Spider Mastermind (versão não usada) | **Chefão final** | 3 (`0_0`, `1_0`, `2_0`) | usa `0_0` + clarão | — | 11 (`3_0..3_4`, `4_0..4_5`), o último vira cadáver |

**Não existem no pack**: Zombieman, Imp, Pinky/Demon, Cacodemon, Hell Knight/Baron, Cyberdemon e o
corpo do Doomguy. O elenco acima cobre os mesmos papéis (fraco, investida, rápido, voador que atira,
tanque). O corpo do Doomguy não faz falta em primeira pessoa.

## Armas (`weapons`, sheet "Weapons" do Dolphman)

| Arma | Parada | Animação de tiro | Clarão |
|---|---|---|---|
| Pistola | `1_9` | `1_10`, `1_11`, `1_12` | `0_0` |
| Shotgun | `3_1` | `3_2`, `3_3`, `3_4` (bombear) | `2_0`, `2_1` |
| Chaingun | `5_0` | alterna `5_0` / `5_1` | `4_0` / `4_2` |
| Lança-foguetes | `5_2` | `5_3` | `4_3..4_6` |
| Rifle de plasma | `5_6` | alterna `5_7` / `5_8` | (já está no frame) |
| BFG 9000 | `5_10` | `5_11` (carrega), `5_12` (dispara) | `4_8`, `4_9` |

Ícone da pistola: `weapons_0_1`. Sobram no atlas e não são usados: soco, motosserra e super shotgun.

## Itens (`pickups`)

| Frames | Uso |
|---|---|
| `3_0..3_3` (poção azul) | gema de XP |
| `3_4..3_7` (capacete) | gema de XP grande (Vassago) |
| `3_8` / `3_11` | estimulante (+12) / medkit (+30) |
| `3_14,3_15` / `3_16,3_17` | armadura (+50) / mega armadura (+100) |
| `3_18..3_21` | Soulsphere (+100 de vida, passa do máximo) |
| `3_22..3_25` | Megasphere: puxa todo o XP do mapa |
| `4_5..4_8` | invulnerabilidade (10 s, tela em negativo como no Doom) |
| `4_15` | berserk (15 s de dano em dobro) |
| `0_1`, `0_3..0_6` | ícones das armas no HUD e nas cartas |
| `1_0..1_3`, `2_1`, `4_0`, `4_1`, `4_9`, `4_11` | ícones das cartas de upgrade |

## Projéteis e efeitos (`fx`)

| Frames | Uso |
|---|---|
| `20_0`, `21_0..21_2` | foguete do jogador e explosão |
| `22_0,22_1`, `22_2..22_5` | plasma e impacto |
| `10_0,10_1`, `8_0..8_2`, `9_0..9_3` | bola da BFG, explosão e "traços" nos inimigos |
| `1_0,1_1`, `1_2..1_5` | raio do Ghoul e impacto |
| `29_0..29_3`, `30_3..30_14` | bola de fogo do Vassago e a chama que fica no chão |
| `2_0,2_1`, `2_2..2_4` | balas do chefão e impacto (também é a morte do Blob) |
| `3_0,3_1` / `4_0,4_1` | orbes dos anéis do chefão (azul / verde na fúria) |
| `24_0..24_7` | névoa de teleporte quando um inimigo nasce |
| `23_0..23_2` | fumaça de bala na parede |
| `11_0..11_2` | sangue |

## Interface

| Atlas | Frames | Uso |
|---|---|---|
| `faces` | linhas 0–4 = cinco níveis de saúde × 3 direções do olhar; 5 = sorriso; 6/7 = dor de lado; 8 = susto; 9 = raiva; `10_0` morto; `10_1` modo deus | rosto do Doomguy no HUD |
| `hud` | `hud_num_0..9`, `hud_pct` | números de vida e armadura |
| `hud` | `hud_pedra` | textura de pedra da barra de status |
| `hud` | `hud_barra`, `hud_menos` | recortados para referência, não usados |
| `menu` | `0_2` logo DOOM, `0_0`/`0_1` caveira-cursor, `1_0` "Pause" | menu e pausa |
| `skies` | `sky_inferno` | céu da arena e fundo do menu |
| `skies` | `sky_nuvens` | fundo da tela de vitória |

## Sons

A pasta `MS-DOS - DOOM _ DOOM II - Miscellaneous - Sound Effects (...)/SFX` tem 144 WAVs originais
(8 bits, mono, 11 kHz). O jogo usa 38. A tabela nome → arquivo está em `src/data/sons.js`, e
`npm run sons` (`tools/copiar-sons.mjs`) copia só os citados para `public/assets/sfx/`.

| Evento no jogo | WAV original |
|---|---|
| Pistola e chaingun (no Doom as duas usam o mesmo som) | `pistol` |
| Shotgun · lança-foguetes · plasma | `shotgun` · `rocket launch` · `plasma` |
| BFG: disparo e explosão | `BFG-9000` · `BFG explode` |
| Explosões (foguete, Banshee) | `barrel explode` |
| Trocar de arma · BFG ainda recarregando | `weapon up` · `player umf` |
| Jogador ferido · morte | `player pain` · `player death` |
| Item · power-up · subir de nível | `item up` · `get powerup` · `secret` |
| Inimigo nascendo | `teleport` |
| Blob morrendo | `gib` |
| Lost Soul: investida · morte | `lost soul attack` · `projectile contact` |
| Banshee: pavio · dor · morte | `banshee activity` · `banshee pain` · `banshee death` |
| Ghoul: aparece · dor · morte (2 variações) | `ghoul sight` · `ghoul pain` · `ghoul death`, `ghoul death 2` |
| Vassago: aparece · ataque · dor · morte | `vassago sight` · `vassago attack` · `vassago pain` · `vassago death` |
| Tiro de inimigo · impacto · chama no chão | `projectile` · `projectile contact` · `incinerator flame hit 1` |
| Chefão: rugido · fúria · morte | `spiderdemon sight` · `cyberdemon sight` · `spiderdemon death` |
| Chefão: passos · metralhadora | `metal walk` · `shotgun` (mais agudo e baixo) |
| Menu: mover · escolher | `platform stop` · `pistol` |
| Início de onda | `klaxon` |

Os sons de inimigos e explosões são **posicionais**: o volume cai com a distância e o lado
(esquerda/direita) acompanha de onde o som vem.

## Gerado por código (não havia asset)

| O quê | Onde | Como |
|---|---|---|
| Texturas de parede (3) e de chão (3) | `src/render/texturas.js` | ruído de valor semeado + padrões (painéis, tijolos, rebites, veios de lava) |
| Mapa da arena | `src/data/mapa.js` | grade 44×44 com pilares e muros descritos em dados |
| A música | `src/systems/Sons.js` | Web Audio: sequenciador de 16 passos (baixo distorcido, bumbo e chimbal) |
| 3 efeitos sem equivalente no pack: XP, dash e fanfarra da vitória | `src/systems/Sons.js` | osciladores e ruído filtrado |
| Números de dano | `src/render/Raycaster.js` | fonte 3×5 pintada direto no buffer |
| Textos da interface | cenas | fonte do sistema (Impact). As fontes do pack estão em `Assets/` mas não foram recortadas: os glifos são colados uns nos outros e não têm acentos confiáveis |

## Sheets de `Assets/` que não entraram no jogo

Armas "id Vault" não usadas (Bayonet, Rifle, Machine Gun, Punch, Chainsaw, Super Shotgun, BFG2704),
Incinerator & Calamity Blade, Fonts, French Localization, Intermission, Widescreen Graphics, App Icons,
Splash Screen e Palette. Para usar qualquer uma, acrescente uma entrada em `tools/sheets.config.mjs`.
