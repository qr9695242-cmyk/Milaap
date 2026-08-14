import {
 collection,
 addDoc,
 doc,
 query,
 orderBy,
 limit,
 onSnapshot,
 serverTimestamp,
 runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { GIFT_DIAMOND_RATE } from "./config";

export const GIFT_CATALOG = [
 { id: "gift1", name: "Rose", icon: "/gifts/gift_001.svg", cost: 80 },
 { id: "gift2", name: "Red Roses Bouquet", icon: "/gifts/gift_002.svg", cost: 120 },
 { id: "gift3", name: "Pink Roses Bouquet", icon: "/gifts/gift_003.svg", cost: 180 },
 { id: "gift4", name: "White Rose", icon: "/gifts/gift_004.svg", cost: 250 },
 { id: "gift5", name: "Golden Rose", icon: "/gifts/gift_005.svg", cost: 400 },
 { id: "gift6", name: "Tulip Bouquet", icon: "/gifts/gift_006.svg", cost: 600 },
 { id: "gift7", name: "Lily Bouquet", icon: "/gifts/gift_007.svg", cost: 800 },
 { id: "gift8", name: "Orchid Bouquet", icon: "/gifts/gift_008.svg", cost: 1200 },
 { id: "gift9", name: "Sunflower", icon: "/gifts/gift_009.svg", cost: 1600 },
 { id: "gift10", name: "Flower Basket", icon: "/gifts/gift_010.svg", cost: 2200 },
 { id: "gift11", name: "Heart Box", icon: "/gifts/gift_011.svg", cost: 3000 },
 { id: "gift12", name: "Love Letter", icon: "/gifts/gift_012.svg", cost: 4000 },
 { id: "gift13", name: "Crystal Heart", icon: "/gifts/gift_013.svg", cost: 5500 },
 { id: "gift14", name: "Pearl Heart", icon: "/gifts/gift_014.svg", cost: 7000 },
 { id: "gift15", name: "Ruby Heart", icon: "/gifts/gift_015.svg", cost: 9000 },
 { id: "gift16", name: "Diamond Heart", icon: "/gifts/gift_016.svg", cost: 12000 },
 { id: "gift17", name: "Silver Ring", icon: "/gifts/gift_017.svg", cost: 16000 },
 { id: "gift18", name: "Gold Ring", icon: "/gifts/gift_018.svg", cost: 22000 },
 { id: "gift19", name: "Ruby Ring", icon: "/gifts/gift_019.svg", cost: 30000 },
 { id: "gift20", name: "Diamond Ring", icon: "/gifts/gift_020.svg", cost: 40000 },
 { id: "gift21", name: "Pearl Necklace", icon: "/gifts/gift_021.svg", cost: 50000 },
 { id: "gift22", name: "Gold Necklace", icon: "/gifts/gift_022.svg", cost: 65000 },
 { id: "gift23", name: "Diamond Necklace", icon: "/gifts/gift_023.svg", cost: 80000 },
 { id: "gift24", name: "Royal Earrings", icon: "/gifts/gift_024.svg", cost: 95000 },
 { id: "gift25", name: "Diamond Earrings", icon: "/gifts/gift_025.svg", cost: 120000 },
 { id: "gift26", name: "Luxury Bracelet", icon: "/gifts/gift_026.svg", cost: 150000 },
 { id: "gift27", name: "Gold Bracelet", icon: "/gifts/gift_027.svg", cost: 180000 },
 { id: "gift28", name: "Royal Watch", icon: "/gifts/gift_028.svg", cost: 220000 },
 { id: "gift29", name: "Diamond Watch", icon: "/gifts/gift_029.svg", cost: 280000 },
 { id: "gift30", name: "Crown Jewel", icon: "/gifts/gift_030.svg", cost: 350000 },
 { id: "gift31", name: "Chocolate Box", icon: "/gifts/gift_031.svg", cost: 400000 },
 { id: "gift32", name: "Luxury Cake", icon: "/gifts/gift_032.svg", cost: 450000 },
 { id: "gift33", name: "Wedding Cake", icon: "/gifts/gift_033.svg", cost: 500000 },
 { id: "gift34", name: "Cupcake Tower", icon: "/gifts/gift_034.svg", cost: 550000 },
 { id: "gift35", name: "Strawberry Cake", icon: "/gifts/gift_035.svg", cost: 600000 },
 { id: "gift36", name: "Ice Cream Sundae", icon: "/gifts/gift_036.svg", cost: 650000 },
 { id: "gift37", name: "Candy Basket", icon: "/gifts/gift_037.svg", cost: 700000 },
 { id: "gift38", name: "Golden Chocolates", icon: "/gifts/gift_038.svg", cost: 800000 },
 { id: "gift39", name: "Royal Dessert", icon: "/gifts/gift_039.svg", cost: 900000 },
 { id: "gift40", name: "Celebration Cake", icon: "/gifts/gift_040.svg", cost: 1000000 },
 { id: "gift41", name: "Coffee Cup", icon: "/gifts/gift_041.svg", cost: 1100000 },
 { id: "gift42", name: "Tea Set", icon: "/gifts/gift_042.svg", cost: 1200000 },
 { id: "gift43", name: "Crystal Glass", icon: "/gifts/gift_043.svg", cost: 1300000 },
 { id: "gift44", name: "Champagne Gift", icon: "/gifts/gift_044.svg", cost: 1400000 },
 { id: "gift45", name: "Golden Goblet", icon: "/gifts/gift_045.svg", cost: 1500000 },
 { id: "gift46", name: "Luxury Dinner", icon: "/gifts/gift_046.svg", cost: 1600000 },
 { id: "gift47", name: "Royal Feast", icon: "/gifts/gift_047.svg", cost: 1800000 },
 { id: "gift48", name: "Diamond Plate", icon: "/gifts/gift_048.svg", cost: 2000000 },
 { id: "gift49", name: "Golden Table", icon: "/gifts/gift_049.svg", cost: 2200000 },
 { id: "gift50", name: "Royal Banquet", icon: "/gifts/gift_050.svg", cost: 2500000 },
 { id: "gift51", name: "Teddy Bear", icon: "/gifts/gift_051.svg", cost: 2800000 },
 { id: "gift52", name: "Luxury Bear", icon: "/gifts/gift_052.svg", cost: 3200000 },
 { id: "gift53", name: "Diamond Bear", icon: "/gifts/gift_053.svg", cost: 3600000 },
 { id: "gift54", name: "Cute Puppy", icon: "/gifts/gift_054.svg", cost: 4000000 },
 { id: "gift55", name: "Royal Cat", icon: "/gifts/gift_055.svg", cost: 4400000 },
 { id: "gift56", name: "Golden Horse", icon: "/gifts/gift_056.svg", cost: 4800000 },
 { id: "gift57", name: "White Horse", icon: "/gifts/gift_057.svg", cost: 5200000 },
 { id: "gift58", name: "Majestic Lion", icon: "/gifts/gift_058.svg", cost: 5600000 },
 { id: "gift59", name: "Royal Eagle", icon: "/gifts/gift_059.svg", cost: 6000000 },
 { id: "gift60", name: "Golden Falcon", icon: "/gifts/gift_060.svg", cost: 6500000 },
 { id: "gift61", name: "Sports Car", icon: "/gifts/gift_061.svg", cost: 7000000 },
 { id: "gift62", name: "Supercar", icon: "/gifts/gift_062.svg", cost: 7500000 },
 { id: "gift63", name: "Luxury Sedan", icon: "/gifts/gift_063.svg", cost: 8000000 },
 { id: "gift64", name: "Golden Car", icon: "/gifts/gift_064.svg", cost: 8500000 },
 { id: "gift65", name: "Royal Limousine", icon: "/gifts/gift_065.svg", cost: 9000000 },
 { id: "gift66", name: "Monster Truck", icon: "/gifts/gift_066.svg", cost: 9500000 },
 { id: "gift67", name: "Racing Bike", icon: "/gifts/gift_067.svg", cost: 10000000 },
 { id: "gift68", name: "Luxury Bike", icon: "/gifts/gift_068.svg", cost: 10500000 },
 { id: "gift69", name: "Cruiser Bike", icon: "/gifts/gift_069.svg", cost: 11000000 },
 { id: "gift70", name: "Royal Motorcycle", icon: "/gifts/gift_070.svg", cost: 11500000 },
 { id: "gift71", name: "Speed Boat", icon: "/gifts/gift_071.svg", cost: 12000000 },
 { id: "gift72", name: "Luxury Yacht", icon: "/gifts/gift_072.svg", cost: 13000000 },
 { id: "gift73", name: "Golden Yacht", icon: "/gifts/gift_073.svg", cost: 14000000 },
 { id: "gift74", name: "Royal Yacht", icon: "/gifts/gift_074.svg", cost: 15000000 },
 { id: "gift75", name: "Private Jet", icon: "/gifts/gift_075.svg", cost: 16000000 },
 { id: "gift76", name: "Luxury Jet", icon: "/gifts/gift_076.svg", cost: 17500000 },
 { id: "gift77", name: "Golden Jet", icon: "/gifts/gift_077.svg", cost: 19000000 },
 { id: "gift78", name: "Helicopter", icon: "/gifts/gift_078.svg", cost: 20500000 },
 { id: "gift79", name: "Royal Helicopter", icon: "/gifts/gift_079.svg", cost: 22000000 },
 { id: "gift80", name: "Space Shuttle", icon: "/gifts/gift_080.svg", cost: 24000000 },
 { id: "gift81", name: "Rocket Ship", icon: "/gifts/gift_081.svg", cost: 26000000 },
 { id: "gift82", name: "Golden Rocket", icon: "/gifts/gift_082.svg", cost: 28000000 },
 { id: "gift83", name: "Moon Trip", icon: "/gifts/gift_083.svg", cost: 30000000 },
 { id: "gift84", name: "Mars Mission", icon: "/gifts/gift_084.svg", cost: 32000000 },
 { id: "gift85", name: "Galaxy Ride", icon: "/gifts/gift_085.svg", cost: 35000000 },
 { id: "gift86", name: "Starship", icon: "/gifts/gift_086.svg", cost: 38000000 },
 { id: "gift87", name: "Cosmic Cruiser", icon: "/gifts/gift_087.svg", cost: 42000000 },
 { id: "gift88", name: "UFO Ride", icon: "/gifts/gift_088.svg", cost: 46000000 },
 { id: "gift89", name: "Planet Tour", icon: "/gifts/gift_089.svg", cost: 50000000 },
 { id: "gift90", name: "Universe Gift", icon: "/gifts/gift_090.svg", cost: 55000000 },
 { id: "gift91", name: "Diamond Rain", icon: "/gifts/gift_091.svg", cost: 60000000 },
 { id: "gift92", name: "Ruby Rain", icon: "/gifts/gift_092.svg", cost: 65000000 },
 { id: "gift93", name: "Gold Rain", icon: "/gifts/gift_093.svg", cost: 70000000 },
 { id: "gift94", name: "Crystal Rain", icon: "/gifts/gift_094.svg", cost: 75000000 },
 { id: "gift95", name: "Money Tower", icon: "/gifts/gift_095.svg", cost: 80000000 },
 { id: "gift96", name: "Gold Tower", icon: "/gifts/gift_096.svg", cost: 85000000 },
 { id: "gift97", name: "Diamond Tower", icon: "/gifts/gift_097.svg", cost: 90000000 },
 { id: "gift98", name: "Royal Palace", icon: "/gifts/gift_098.svg", cost: 95000000 },
 { id: "gift99", name: "Golden Palace", icon: "/gifts/gift_099.svg", cost: 100000000 },
 { id: "gift100", name: "Royal Castle", icon: "/gifts/gift_100.svg", cost: 110000000 },
 { id: "gift101", name: "Magic Castle", icon: "/gifts/gift_101.svg", cost: 120000000 },
 { id: "gift102", name: "Sky Castle", icon: "/gifts/gift_102.svg", cost: 130000000 },
 { id: "gift103", name: "Floating Palace", icon: "/gifts/gift_103.svg", cost: 140000000 },
 { id: "gift104", name: "Kingdom", icon: "/gifts/gift_104.svg", cost: 150000000 },
 { id: "gift105", name: "Golden Kingdom", icon: "/gifts/gift_105.svg", cost: 160000000 },
 { id: "gift106", name: "Royal Throne", icon: "/gifts/gift_106.svg", cost: 170000000 },
 { id: "gift107", name: "Golden Throne", icon: "/gifts/gift_107.svg", cost: 180000000 },
 { id: "gift108", name: "Emperor Crown", icon: "/gifts/gift_108.svg", cost: 190000000 },
 { id: "gift109", name: "Legend Crown", icon: "/gifts/gift_109.svg", cost: 200000000 },
 { id: "gift110", name: "Imperial Crown", icon: "/gifts/gift_110.svg", cost: 220000000 },
 { id: "gift111", name: "Dragon Statue", icon: "/gifts/gift_111.svg", cost: 240000000 },
 { id: "gift112", name: "Golden Dragon", icon: "/gifts/gift_112.svg", cost: 260000000 },
 { id: "gift113", name: "Ice Dragon", icon: "/gifts/gift_113.svg", cost: 280000000 },
 { id: "gift114", name: "Fire Dragon", icon: "/gifts/gift_114.svg", cost: 300000000 },
 { id: "gift115", name: "Phoenix Statue", icon: "/gifts/gift_115.svg", cost: 320000000 },
 { id: "gift116", name: "Golden Phoenix", icon: "/gifts/gift_116.svg", cost: 340000000 },
 { id: "gift117", name: "Unicorn Statue", icon: "/gifts/gift_117.svg", cost: 360000000 },
 { id: "gift118", name: "Golden Unicorn", icon: "/gifts/gift_118.svg", cost: 380000000 },
 { id: "gift119", name: "Griffin Statue", icon: "/gifts/gift_119.svg", cost: 400000000 },
 { id: "gift120", name: "Royal Griffin", icon: "/gifts/gift_120.svg", cost: 420000000 },
 { id: "gift121", name: "Treasure Chest", icon: "/gifts/gift_121.svg", cost: 440000000 },
 { id: "gift122", name: "Golden Treasure", icon: "/gifts/gift_122.svg", cost: 460000000 },
 { id: "gift123", name: "Diamond Chest", icon: "/gifts/gift_123.svg", cost: 480000000 },
 { id: "gift124", name: "Royal Vault", icon: "/gifts/gift_124.svg", cost: 500000000 },
 { id: "gift125", name: "Gold Vault", icon: "/gifts/gift_125.svg", cost: 550000000 },
 { id: "gift126", name: "Diamond Vault", icon: "/gifts/gift_126.svg", cost: 600000000 },
 { id: "gift127", name: "Treasure Island", icon: "/gifts/gift_127.svg", cost: 650000000 },
 { id: "gift128", name: "Private Island", icon: "/gifts/gift_128.svg", cost: 700000000 },
 { id: "gift129", name: "Royal Island", icon: "/gifts/gift_129.svg", cost: 750000000 },
 { id: "gift130", name: "Paradise Island", icon: "/gifts/gift_130.svg", cost: 800000000 },
 { id: "gift131", name: "Diamond Ring Box", icon: "/gifts/gift_131.svg", cost: 850000000 },
 { id: "gift132", name: "Royal Jewel Box", icon: "/gifts/gift_132.svg", cost: 900000000 },
 { id: "gift133", name: "Golden Medallion", icon: "/gifts/gift_133.svg", cost: 950000000 },
 { id: "gift134", name: "Diamond Medallion", icon: "/gifts/gift_134.svg", cost: 1000000000 },
 { id: "gift135", name: "Royal Scepter", icon: "/gifts/gift_135.svg", cost: 1100000000 },
 { id: "gift136", name: "Golden Scepter", icon: "/gifts/gift_136.svg", cost: 1200000000 },
 { id: "gift137", name: "Imperial Staff", icon: "/gifts/gift_137.svg", cost: 1300000000 },
 { id: "gift138", name: "Royal Sword", icon: "/gifts/gift_138.svg", cost: 1400000000 },
 { id: "gift139", name: "Golden Sword", icon: "/gifts/gift_139.svg", cost: 1500000000 },
 { id: "gift140", name: "Legendary Sword", icon: "/gifts/gift_140.svg", cost: 1600000000 },
 { id: "gift141", name: "Grand Piano", icon: "/gifts/gift_141.svg", cost: 1700000000 },
 { id: "gift142", name: "Golden Piano", icon: "/gifts/gift_142.svg", cost: 1800000000 },
 { id: "gift143", name: "Luxury Guitar", icon: "/gifts/gift_143.svg", cost: 1900000000 },
 { id: "gift144", name: "Diamond Guitar", icon: "/gifts/gift_144.svg", cost: 2000000000 },
 { id: "gift145", name: "Royal Violin", icon: "/gifts/gift_145.svg", cost: 2200000000 },
 { id: "gift146", name: "Golden Violin", icon: "/gifts/gift_146.svg", cost: 2400000000 },
 { id: "gift147", name: "Concert Stage", icon: "/gifts/gift_147.svg", cost: 2600000000 },
 { id: "gift148", name: "Music Palace", icon: "/gifts/gift_148.svg", cost: 2800000000 },
 { id: "gift149", name: "Royal Concert", icon: "/gifts/gift_149.svg", cost: 3000000000 },
 { id: "gift150", name: "Legend Concert", icon: "/gifts/gift_150.svg", cost: 3200000000 },
 { id: "gift151", name: "Luxury Phone", icon: "/gifts/gift_151.svg", cost: 3400000000 },
 { id: "gift152", name: "Diamond Phone", icon: "/gifts/gift_152.svg", cost: 3600000000 },
 { id: "gift153", name: "Golden Phone", icon: "/gifts/gift_153.svg", cost: 3800000000 },
 { id: "gift154", name: "Royal Laptop", icon: "/gifts/gift_154.svg", cost: 4000000000 },
 { id: "gift155", name: "Gaming Setup", icon: "/gifts/gift_155.svg", cost: 4200000000 },
 { id: "gift156", name: "Diamond Headset", icon: "/gifts/gift_156.svg", cost: 4400000000 },
 { id: "gift157", name: "Luxury Camera", icon: "/gifts/gift_157.svg", cost: 4600000000 },
 { id: "gift158", name: "Golden Camera", icon: "/gifts/gift_158.svg", cost: 4800000000 },
 { id: "gift159", name: "Royal TV", icon: "/gifts/gift_159.svg", cost: 5000000000 },
 { id: "gift160", name: "Cinema Room", icon: "/gifts/gift_160.svg", cost: 5500000000 },
 { id: "gift161", name: "Luxury Mansion", icon: "/gifts/gift_161.svg", cost: 6000000000 },
 { id: "gift162", name: "Golden Mansion", icon: "/gifts/gift_162.svg", cost: 6500000000 },
 { id: "gift163", name: "Royal Mansion", icon: "/gifts/gift_163.svg", cost: 7000000000 },
 { id: "gift164", name: "Dream Villa", icon: "/gifts/gift_164.svg", cost: 7500000000 },
 { id: "gift165", name: "Beach Villa", icon: "/gifts/gift_165.svg", cost: 8000000000 },
 { id: "gift166", name: "Sky Villa", icon: "/gifts/gift_166.svg", cost: 8500000000 },
 { id: "gift167", name: "Royal Resort", icon: "/gifts/gift_167.svg", cost: 9000000000 },
 { id: "gift168", name: "Golden Resort", icon: "/gifts/gift_168.svg", cost: 9500000000 },
 { id: "gift169", name: "Private Resort", icon: "/gifts/gift_169.svg", cost: 10000000000 },
 { id: "gift170", name: "Paradise Resort", icon: "/gifts/gift_170.svg", cost: 11000000000 },
 { id: "gift171", name: "Diamond Globe", icon: "/gifts/gift_171.svg", cost: 12000000000 },
 { id: "gift172", name: "Golden Globe", icon: "/gifts/gift_172.svg", cost: 13000000000 },
 { id: "gift173", name: "Royal Globe", icon: "/gifts/gift_173.svg", cost: 14000000000 },
 { id: "gift174", name: "Galaxy Globe", icon: "/gifts/gift_174.svg", cost: 15000000000 },
 { id: "gift175", name: "Solar System", icon: "/gifts/gift_175.svg", cost: 16000000000 },
 { id: "gift176", name: "Milky Way", icon: "/gifts/gift_176.svg", cost: 17000000000 },
 { id: "gift177", name: "Nebula", icon: "/gifts/gift_177.svg", cost: 18000000000 },
 { id: "gift178", name: "Supernova", icon: "/gifts/gift_178.svg", cost: 19000000000 },
 { id: "gift179", name: "Black Hole", icon: "/gifts/gift_179.svg", cost: 20000000000 },
 { id: "gift180", name: "Cosmic Galaxy", icon: "/gifts/gift_180.svg", cost: 22000000000 },
 { id: "gift181", name: "Eternal Love", icon: "/gifts/gift_181.svg", cost: 24000000000 },
 { id: "gift182", name: "Royal Love", icon: "/gifts/gift_182.svg", cost: 26000000000 },
 { id: "gift183", name: "Diamond Love", icon: "/gifts/gift_183.svg", cost: 28000000000 },
 { id: "gift184", name: "Golden Love", icon: "/gifts/gift_184.svg", cost: 30000000000 },
 { id: "gift185", name: "Forever Gift", icon: "/gifts/gift_185.svg", cost: 32000000000 },
 { id: "gift186", name: "Legendary Love", icon: "/gifts/gift_186.svg", cost: 35000000000 },
 { id: "gift187", name: "Royal Celebration", icon: "/gifts/gift_187.svg", cost: 38000000000 },
 { id: "gift188", name: "Grand Celebration", icon: "/gifts/gift_188.svg", cost: 42000000000 },
 { id: "gift189", name: "Ultimate Gift", icon: "/gifts/gift_189.svg", cost: 46000000000 },
 { id: "gift190", name: "Legendary Gift", icon: "/gifts/gift_190.svg", cost: 50000000000 },
 { id: "gift191", name: "Royal Phoenix", icon: "/gifts/gift_191.svg", cost: 54000000000 },
 { id: "gift192", name: "Golden Empire", icon: "/gifts/gift_192.svg", cost: 58000000000 },
 { id: "gift193", name: "Diamond Empire", icon: "/gifts/gift_193.svg", cost: 62000000000 },
 { id: "gift194", name: "Celestial Crown", icon: "/gifts/gift_194.svg", cost: 66000000000 },
 { id: "gift195", name: "Heavenly Palace", icon: "/gifts/gift_195.svg", cost: 70000000000 },
 { id: "gift196", name: "Eternal Kingdom", icon: "/gifts/gift_196.svg", cost: 75000000000 },
 { id: "gift197", name: "Infinity Gift", icon: "/gifts/gift_197.svg", cost: 80000000000 },
 { id: "gift198", name: "Galaxy Crown", icon: "/gifts/gift_198.svg", cost: 85000000000 },
 { id: "gift199", name: "Universe Throne", icon: "/gifts/gift_199.svg", cost: 90000000000 },
 { id: "gift200", name: "Milaap Legend", icon: "/gifts/gift_200.svg", cost: 100000000000 },
];

/**
 * Send a gift: atomically deducts coins from sender and credits
 * diamonds to the receiver (usually the room host), then logs it
 * to the room's live gift feed.
 */
export function getGiftById(id) {
 return GIFT_CATALOG.find((gift) => gift.id === id) || null;
}

export async function sendGift(roomId, { fromUid, fromName, toUid, toName, gift }) {
 await runTransaction(db, async (tx) => {
 const senderRef = doc(db, "users", fromUid);
 const receiverRef = toUid && toUid !== fromUid ? doc(db, "users", toUid) : null;

 // Firestore transactions require ALL reads to happen before ANY writes —
 // so both docs are read first, then both are written, instead of the
 // previous read→write→read→write interleaving that Firestore rejects.
 const senderSnap = await tx.get(senderRef);
 if (!senderSnap.exists()) throw new Error("Sender profile not found");
 const receiverSnap = receiverRef ? await tx.get(receiverRef) : null;

 const senderCoins = senderSnap.data().coins || 0;
 if (senderCoins < gift.cost) throw new Error("Not enough coins");

 // Lifetime gifted total drives the Gift Level ladder (lib/giftLevel.js),
 // same shortcut lib/vip.js takes with totalRechargedRs — nothing spends
 // this counter back down, so it stays a true lifetime total.
 const totalCoinsGifted = (senderSnap.data().totalCoinsGifted || 0) + gift.cost;
 tx.update(senderRef, { coins: senderCoins - gift.cost, totalCoinsGifted });

 if (receiverSnap?.exists()) {
 // TikTok-style cut: platform keeps ~50%, host gets the rest as diamonds.
 const diamondsEarned = Math.floor(gift.cost * GIFT_DIAMOND_RATE);
 const receiverDiamonds = receiverSnap.data().diamonds || 0;
 tx.update(receiverRef, { diamonds: receiverDiamonds + diamondsEarned });
 }
 });

 await addDoc(collection(db, "rooms", roomId, "gifts"), {
 fromUid,
 fromName,
 toUid,
 toName,
 giftId: gift.id,
 giftName: gift.name,
 giftIcon: gift.icon,
 cost: gift.cost,
 createdAt: serverTimestamp(),
 });
}

export function listenGiftFeed(roomId, callback, max = 15) {
 const q = query(
 collection(db, "rooms", roomId, "gifts"),
 orderBy("createdAt", "desc"),
 limit(max)
 );
 return onSnapshot(q, (snap) => {
 callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse());
 });
}
