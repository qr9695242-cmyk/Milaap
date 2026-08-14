export const GAME_CATALOG = [
 { id: 'chess', title: 'Chess', href: '/games/chess', desc: 'Full board • legal moves • solo AI + match', icon: 'Crown' },
 { id: 'carrom', title: 'Carrom', href: '/games/carrom', desc: 'Board physics • aiming • solo + match', icon: 'CircleDot' },
 { id: 'archery', title: 'Archery', href: '/games/archery', desc: 'Aim • target physics • solo + match', icon: 'Target' },
 { id: 'fishing', title: 'Fishing', href: '/games/fishing', desc: 'Aim • hook • moving fish • skill score', icon: 'Fish' },
 { id: 'crazygems', title: 'CrazyGems', href: '/games/crazygems', desc: 'Gem puzzle • combos • score progression', icon: 'Gem' },
 { id: 'crazyfruit', title: 'CrazyFruit', href: '/games/crazyfruit', desc: 'Timed fruit challenge • combos • scoring', icon: 'Cherry' },
 { id: 'greedyfarm', title: 'GreedyFarm', href: '/games/greedyfarm', desc: 'Plant • grow • harvest • progression', icon: 'Sprout' },
 { id: 'ludo', title: 'Ludo', href: '/games/ludo', desc: 'Full Ludo rules • 2/4 player real-time', icon: 'Dices' },
 { id: 'lucky777', title: 'Lucky777', href: '/games/lucky777', desc: 'Reel/slot-style virtual-coin arcade', icon: 'Sparkles' },
 { id: 'giftwheel', title: 'GiftWheel', href: '/games/giftwheel', desc: 'Interactive wheel • virtual rewards', icon: 'CircleDashed' },
 { id: 'greedybaby', title: 'GreedyBaby', href: '/games/greedybaby', desc: 'Catch challenge • timing • progression', icon: 'Baby' },
 { id: 'fortunelamp', title: 'FortuneLamp', href: '/games/fortunelamp', desc: 'Reveal challenge • virtual rewards', icon: 'Lamp' },
 { id: 'original777', title: 'Original777', href: '/games/original777', desc: 'High/low card challenge • virtual coins', icon: 'Spade' },
 { id: 'gatesofolympus', title: 'GatesOfOlympus', href: '/games/gatesofolympus', desc: 'Grid/tumble-style virtual-coin game', icon: 'Zap' },
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
