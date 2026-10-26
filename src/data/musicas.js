// A trilha sonora: as músicas da jukebox (systems/Jukebox.js), no estilo do Tony Hawk's
// Pro Skater. Os arquivos ficam em public/assets/musica/<arquivo>.mp3 e são tocados em
// streaming: nada disso é baixado no carregamento do jogo.
//
//   id        nome usado no código e no armazenamento das preferências
//   artista / titulo / album / ano   o que aparece na tela de música e no "tocando agora"
//
// Para acrescentar uma música: copie o MP3 para public/assets/musica e ponha uma linha aqui.

export const MUSICAS = [
  { id: 'nemesis', arquivo: 'arch-enemy-nemesis', artista: 'Arch Enemy', titulo: 'Nemesis', album: 'Doomsday Machine', ano: 2005 },
  { id: 'noRemorse', arquivo: 'cannibal-corpse-no-remorse', artista: 'Cannibal Corpse', titulo: 'No Remorse', album: 'Gore Obsessed', ano: 2002 },
  { id: 'stricken', arquivo: 'disturbed-stricken', artista: 'Disturbed', titulo: 'Stricken', album: 'Ten Thousand Fists', ano: 2005 },
  { id: 'bookOfHeavyMetal', arquivo: 'dream-evil-the-book-of-heavy-metal', artista: 'Dream Evil', titulo: 'The Book of Heavy Metal', album: 'The Book of Heavy Metal', ano: 2004 },
  { id: 'oneShotOneKill', arquivo: 'dying-fetus-one-shot-one-kill', artista: 'Dying Fetus', titulo: 'One Shot, One Kill', album: 'Stop at Nothing', ano: 2003 },
  { id: 'iStandAlone', arquivo: 'godsmack-i-stand-alone', artista: 'Godsmack', titulo: 'I Stand Alone', album: 'Faceless', ano: 2003 },
  { id: 'numberOfTheBeast', arquivo: 'iron-maiden-the-number-of-the-beast', artista: 'Iron Maiden', titulo: 'The Number of the Beast', album: 'The Number of the Beast', ano: 1982 },
  { id: 'wastedYears', arquivo: 'iron-maiden-wasted-years', artista: 'Iron Maiden', titulo: 'Wasted Years', album: 'Somewhere in Time', ano: 1986 },
  { id: 'twoMinutes', arquivo: 'iron-maiden-2-minutes-to-midnight', artista: 'Iron Maiden', titulo: '2 Minutes to Midnight (ao vivo)', album: 'Live After Death', ano: 1985 },
  { id: 'painkiller', arquivo: 'judas-priest-painkiller', artista: 'Judas Priest', titulo: 'Painkiller', album: 'Painkiller', ano: 1990 },
  { id: 'laidToRest', arquivo: 'lamb-of-god-laid-to-rest', artista: 'Lamb of God', titulo: 'Laid to Rest', album: 'Ashes of the Wake', ano: 2004 },
  { id: 'seekAndDestroy', arquivo: 'metallica-seek-and-destroy', artista: 'Metallica', titulo: 'Seek & Destroy', album: "Kill 'Em All", ano: 1983 },
  { id: 'whenAllIsSaid', arquivo: 'napalm-death-when-all-is-said-and-done', artista: 'Napalm Death', titulo: 'When All Is Said and Done', album: 'Smear Campaign', ano: 2006 },
  { id: 'aidsPopRepressao', arquivo: 'ratos-de-porao-aids-pop-repressao', artista: 'Ratos de Porão', titulo: 'Aids, Pop, Repressão (ao vivo)', album: 'RDP ao Vivo', ano: 1992 },
  { id: 'policia', arquivo: 'sepultura-policia-ao-vivo', artista: 'Sepultura', titulo: 'Polícia (ao vivo)', album: 'ao vivo', ano: 1994 },
  { id: 'territory', arquivo: 'sepultura-territory', artista: 'Sepultura', titulo: 'Territory', album: 'Chaos A.D.', ano: 1993 },
  { id: 'angelOfDeath', arquivo: 'slayer-angel-of-death', artista: 'Slayer', titulo: 'Angel of Death', album: 'Reign in Blood', ano: 1986 },
  { id: 'blackMagic', arquivo: 'slayer-black-magic', artista: 'Slayer', titulo: 'Black Magic', album: 'Show No Mercy', ano: 1983 },
];

// A música do menu principal (toca em loop até o jogador começar uma partida).
export const MUSICA_DO_MENU = 'bookOfHeavyMetal';

export const musicaPorId = (id) => MUSICAS.find(m => m.id === id) || null;
