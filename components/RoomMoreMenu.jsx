"use client";
import { useState } from "react";
import Link from "next/link";
import { Dices, Gift, Radio, Music2, ShoppingBag, Sparkles, PackageOpen, Gamepad2, Trophy, Users, ChevronDown, Target, CarFront, CircleDot, Copy, Type, FlagTriangleRight, Grid3X3, PanelsTopLeft, Layers3, Route, Crown, Cherry } from "lucide-react";

const GAMES = [
  ["/games/ludo","Ludo",Dices],["/games/carrom","Carrom",CircleDot],["/games/8ball","8 Ball",CircleDot],["/games/chess","Chess",Crown],
  ["/games/checkers","Checkers",Grid3X3],["/games/dominoes","Dominoes",PanelsTopLeft],["/games/uno","UNO",Layers3],["/games/teenpatti","Teen Patti",Copy],
  ["/games/rummy","Rummy",Copy],["/games/snake-ladder","Snake & Ladder",Route],["/games/car-race","Car Race",CarFront],["/games/archery","Archery",Target],
  ["/games/bowling","Bowling",CircleDot],["/games/darts","Darts",Target],["/games/mini-golf","Mini Golf",FlagTriangleRight],["/games/quiz","Quiz",Trophy],
  ["/games/word","Word",Type],["/games/fruit-clash","Fruit Clash",Cherry]
].map(([href,label,Icon])=>({href,label,Icon}));
const PARTY = [
  {href:"/games/ludo",label:"Ludo",Icon:Dices},{href:"/rewards",label:"Lucky Bag",Icon:Gift},
  {href:"/live-match",label:"PK",Icon:Radio},{href:"/live",label:"Video / Music",Icon:Music2}
];
const TOOLS = [
  {href:"/store",label:"Store",Icon:ShoppingBag},{href:"/profile/frames",label:"Effect",Icon:Sparkles},{href:"/items",label:"My Items",Icon:PackageOpen}
];
function MenuSection({title,items,onClose}){return <section className="mt-4"><h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-mist">{title}</h3><div className="grid grid-cols-4 gap-2">{items.map(({href,label,Icon})=><Link key={`${title}-${label}`} href={href} onClick={onClose} className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-panel2 px-1.5 py-2.5 ring-1 ring-white/10 active:scale-95"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold"><Icon size={20} strokeWidth={2.1}/></span><span className="w-full truncate text-center text-[9px] font-bold text-ink">{label}</span></Link>)}</div></section>}
export default function RoomMoreMenu({unread=0}){const [open,setOpen]=useState(false);const close=()=>setOpen(false);return <><button onClick={()=>setOpen(true)} aria-label="Room menu" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-panel text-sm ring-1 ring-white/10 active:scale-95"><span className="grid grid-cols-2 gap-1"><i className="h-1.5 w-1.5 rounded-sm bg-ink"/><i className="h-1.5 w-1.5 rounded-sm bg-ink"/><i className="h-1.5 w-1.5 rounded-sm bg-ink"/><i className="h-1.5 w-1.5 rounded-sm bg-ink"/></span>{unread>0&&<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-neon-pink ring-2 ring-void"/>}</button>{open&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={close}><div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-panel px-4 pb-5 pt-4 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20"/><div className="flex items-center justify-between px-1"><div><h2 className="font-display text-base font-bold text-ink">Room Menu</h2><p className="text-[10px] text-mist">All games, Party and Tools</p></div><button onClick={close} aria-label="Close" className="rounded-full bg-white/10 p-2 text-mist"><ChevronDown size={18}/></button></div><MenuSection title="Games" items={GAMES} onClose={close}/><MenuSection title="Party" items={PARTY} onClose={close}/><MenuSection title="Tools" items={TOOLS} onClose={close}/></div></div>}</>}
