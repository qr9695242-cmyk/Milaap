export const GAME_CATALOG = [
 { id: 'ludo', title: 'Ludo', href: '/games/ludo', desc: 'Full Ludo rules • 2/4 player real-time', icon: 'Dices' },
 { id: 'chess', title: 'Chess', href: '/games/chess', desc: 'Legal chess moves • solo AI + match', icon: 'Crown' },
 { id: 'carrom', title: 'Carrom', href: '/games/carrom', desc: 'Board • striker • pockets • solo + match', icon: 'CircleDot' },
 { id: 'archery', title: 'Archery', href: '/games/archery', desc: 'Aim • target • scoring • solo + match', icon: 'Target' },
];

export const GIFT_CATALOG_18 = [
 ['rose','Rose','/gifts/gift_001.svg',20], ['heart','Heart','/gifts/gift_013.svg',4000], ['ring','Ring','/gifts/gift_017.svg',16000], ['crown','Crown','/gifts/gift_030.svg',40000],
 ['car','Sports Car','/gifts/gift_061.svg',400000], ['rocket','Rocket','/gifts/gift_081.svg',800000], ['diamond','Diamond Rain','/gifts/gift_091.svg',1600000], ['castle','Royal Castle','/gifts/gift_100.svg',4000000],
 ['dragon','Golden Dragon','/gifts/gift_111.svg',8000000], ['phoenix','Phoenix','/gifts/gift_116.svg',12000000], ['yacht','Luxury Yacht','/gifts/gift_073.svg',16000000], ['jet','Private Jet','/gifts/gift_075.svg',24000000],
 ['galaxy','Galaxy','/gifts/gift_090.svg',32000000], ['unicorn','Unicorn','/gifts/gift_117.svg',40000000], ['throne','Royal Throne','/gifts/gift_108.svg',50000000], ['world','Wonder World','/gifts/gift_180.svg',65000000],
 ['king','Kingdom','/gifts/gift_105.svg',80000000], ['legend','Legendary Crown','/gifts/gift_200.svg',100000000],
].map(([id,name,icon,cost]) => ({id,name,icon,cost}));

export const RECHARGE_PACKAGES_18 = [
 [150,160],[500,533],[1000,1067],[2500,2667],[5000,5333],[10000,10667],
 [25000,26667],[50000,53333],[100000,106667],[250000,266667],[500000,533333],[1000000,1066667],
 [2500000,2666667],[5000000,5333333],[10000000,10666667],[25000000,26666667],[50000000,53333333],[100000000,106666667]
].map(([priceRs,coins],i)=>({id:`p${i+1}`,coins,priceRs}));

export const TABLES = Array.from({length:6},(_,i)=>({id:`table-${i+1}`,name:`Table ${i+1}`,capacity:6}));
