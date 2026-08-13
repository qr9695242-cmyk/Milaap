export const GAME_CATALOG = [
  { id: 'ludo', title: 'Ludo', href: '/games/ludo', desc: '2/4 player real-time match', icon: 'Dices' },
  { id: 'carrom', title: 'Carrom', href: '/games/carrom', desc: 'Classic carrom board', icon: 'CircleDot' },
  { id: 'chess', title: 'Chess', href: '/games/chess', desc: '1v1 strategy board', icon: 'Crown' },
  { id: 'archery', title: 'Archery', href: '/games/archery', desc: 'Aim challenge', icon: 'Target' },
  { id: 'lucky777', title: 'Lucky777', href: '/games/lucky777', desc: 'Free-play slot arcade • no real money', icon: 'Sparkles' },
  { id: 'crazyfruit', title: 'CrazyFruit', href: '/games/crazyfruit', desc: 'Free-play tap & match • no real money', icon: 'Cherry' },
  { id: 'giftwheel', title: 'GiftWheel', href: '/games/giftwheel', desc: 'Free-play spin wheel • no real money', icon: 'CircleDashed' },
  { id: 'greedybaby', title: 'GreedyBaby', href: '/games/greedybaby', desc: 'Free-play catch game • no real money', icon: 'Baby' },
  { id: 'greedyfarm', title: 'GreedyFarm', href: '/games/greedyfarm', desc: 'Free-play harvest game • no real money', icon: 'Sprout' },
  { id: 'crazygems', title: 'CrazyGems', href: '/games/crazygems', desc: 'Free-play memory match • no real money', icon: 'Gem' },
  { id: 'fishing', title: 'Fishing', href: '/games/fishing', desc: 'Free-play catch game • no real money', icon: 'Fish' },
  { id: 'fortunelamp', title: 'FortuneLamp', href: '/games/fortunelamp', desc: 'Free-play fortune reveal • no real money', icon: 'Lamp' },
  { id: 'original777', title: 'Original777', href: '/games/original777', desc: 'Free-play high-low cards • no real money', icon: 'Spade' },
  { id: 'gatesofolympus', title: 'GatesOfOlympus', href: '/games/gatesofolympus', desc: 'Free-play match game • no real money', icon: 'Zap' },
];

export const GIFT_CATALOG_18 = [
  ['rose','Rose','/gifts/gift_001.svg',800], ['heart','Heart','/gifts/gift_013.svg',4000], ['ring','Ring','/gifts/gift_017.svg',16000], ['crown','Crown','/gifts/gift_030.svg',40000],
  ['car','Sports Car','/gifts/gift_061.svg',400000], ['rocket','Rocket','/gifts/gift_081.svg',800000], ['diamond','Diamond Rain','/gifts/gift_091.svg',1600000], ['castle','Royal Castle','/gifts/gift_100.svg',4000000],
  ['dragon','Golden Dragon','/gifts/gift_111.svg',8000000], ['phoenix','Phoenix','/gifts/gift_116.svg',12000000], ['yacht','Luxury Yacht','/gifts/gift_073.svg',16000000], ['jet','Private Jet','/gifts/gift_075.svg',24000000],
  ['galaxy','Galaxy','/gifts/gift_090.svg',32000000], ['unicorn','Unicorn','/gifts/gift_117.svg',40000000], ['throne','Royal Throne','/gifts/gift_108.svg',50000000], ['world','Wonder World','/gifts/gift_180.svg',65000000],
  ['king','Kingdom','/gifts/gift_105.svg',80000000], ['legend','Legendary Crown','/gifts/gift_200.svg',100000000],
].map(([id,name,icon,cost]) => ({id,name,icon,cost}));

export const RECHARGE_PACKAGES_18 = [
  [5000,150],[20000,500],[50000,1200],[150000,3000],[400000,6500],[1000000,14000],
  [2500000,30000],[6000000,70000],[15000000,150000],[35000000,300000],[80000000,700000],[200000000,1500000],
  [500000000,3000000],[1200000000,7000000],[3000000000,15000000],[7000000000,30000000],[15000000000,70000000],[30000000000,150000000]
].map(([coins,priceRs],i)=>({id:`p${i+1}`,coins,priceRs}));

export const TABLES = Array.from({length:6},(_,i)=>({id:`table-${i+1}`,name:`Table ${i+1}`,capacity:6}));
