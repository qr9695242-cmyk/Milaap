export const GAME_CATALOG = [
  { id: 'ludo', title: 'Ludo', emoji: '🎲', href: '/games/ludo', desc: '2/4 player real-time match' },
  { id: 'carrom', title: 'Carrom', emoji: '🎯', href: '/games/carrom', desc: 'Premium board lobby' },
  { id: '8ball', title: '8 Ball Pool', emoji: '🎱', href: '/games/8ball', desc: 'Pool battle' },
  { id: 'chess', title: 'Chess', emoji: '♟️', href: '/games/chess', desc: '1v1 strategy' },
  { id: 'checkers', title: 'Checkers', emoji: '🔴', href: '/games/checkers', desc: 'Classic duel' },
  { id: 'dominoes', title: 'Dominoes', emoji: '🀄', href: '/games/dominoes', desc: 'Table match' },
  { id: 'uno', title: 'UNO', emoji: '🃏', href: '/games/uno', desc: 'Card party' },
  { id: 'teenpatti', title: 'Teen Patti', emoji: '🂡', href: '/games/teenpatti', desc: 'Private tables' },
  { id: 'rummy', title: 'Rummy', emoji: '🃏', href: '/games/rummy', desc: 'Card room' },
  { id: 'ladders', title: 'Snake & Ladder', emoji: '🐍', href: '/games/snake-ladder', desc: 'Fast board race' },
  { id: 'car-race', title: 'Car Race', emoji: '🏎️', href: '/games/car-race', desc: 'Arcade race' },
  { id: 'archery', title: 'Archery', emoji: '🏹', href: '/games/archery', desc: 'Aim challenge' },
  { id: 'bowling', title: 'Bowling', emoji: '🎳', href: '/games/bowling', desc: 'Strike battle' },
  { id: 'darts', title: 'Darts', emoji: '🎯', href: '/games/darts', desc: 'Score duel' },
  { id: 'minigolf', title: 'Mini Golf', emoji: '⛳', href: '/games/mini-golf', desc: 'Quick course' },
  { id: 'quiz', title: 'Quiz Battle', emoji: '🧠', href: '/games/quiz', desc: 'Live trivia' },
  { id: 'word', title: 'Word Battle', emoji: '🔤', href: '/games/word', desc: 'Speed words' },
  { id: 'fruit', title: 'Fruit Clash', emoji: '🍉', href: '/games/fruit-clash', desc: 'Arcade challenge' },
];

export const GIFT_CATALOG_18 = [
  ['rose','Rose','🌹',800], ['heart','Heart','❤️',4000], ['ring','Ring','💍',16000], ['crown','Crown','👑',40000],
  ['car','Sports Car','🏎️',400000], ['rocket','Rocket','🚀',800000], ['diamond','Diamond Rain','💎',1600000], ['castle','Royal Castle','🏰',4000000],
  ['dragon','Golden Dragon','🐉',8000000], ['phoenix','Phoenix','🔥',12000000], ['yacht','Luxury Yacht','🛥️',16000000], ['jet','Private Jet','✈️',24000000],
  ['galaxy','Galaxy','🌌',32000000], ['unicorn','Unicorn','🦄',40000000], ['throne','Royal Throne','👑',50000000], ['world','Wonder World','🌍',65000000],
  ['king','Kingdom','🏯',80000000], ['legend','Legendary Crown','🤴',100000000],
].map(([id,name,icon,cost]) => ({id,name,icon,cost}));

export const RECHARGE_PACKAGES_18 = [
  [5000,150],[20000,500],[50000,1200],[150000,3000],[400000,6500],[1000000,14000],
  [2500000,30000],[6000000,70000],[15000000,150000],[35000000,300000],[80000000,700000],[200000000,1500000],
  [500000000,3000000],[1200000000,7000000],[3000000000,15000000],[7000000000,30000000],[15000000000,70000000],[30000000000,150000000]
].map(([coins,priceRs],i)=>({id:`p${i+1}`,coins,priceRs}));

export const TABLES = Array.from({length:6},(_,i)=>({id:`table-${i+1}`,name:`Table ${i+1}`,capacity:6}));
