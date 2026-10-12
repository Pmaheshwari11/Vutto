import React from 'react';
import { Gauge, Zap, Trophy, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Auction } from '../types';
import { CountdownTimer } from './CountdownTimer';

interface AuctionCardProps {
  auction: Auction;
  onSelect: (auction: Auction) => void;
  isUserWinning?: boolean;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction, onSelect, isUserWinning }) => {
  const isLive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';

  return (
    <div
      onClick={() => onSelect(auction)}
      className={`group relative glass-panel glass-panel-hover overflow-hidden flex flex-col cursor-pointer transition-all duration-300 ${
        isUserWinning ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/40' : ''
      }`}
    >
      {/* Top Media Area */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-950">
        <img
          src={auction.images[0]}
          alt={auction.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-amber-400">
            {auction.category}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-emerald-950/90 border border-emerald-500/80 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-dot" />
              LIVE
            </span>
          )}
        </div>

        {/* Countdown Timer top right */}
        <div className="absolute top-3 right-3">
          <CountdownTimer
            endTime={auction.end_time}
            status={auction.status}
            extensionCount={auction.extension_count}
            size="sm"
          />
        </div>

        {/* Condition Score pill bottom left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-slate-700 text-xs text-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono font-bold text-white">{auction.condition_score}</span>
          <span className="text-[10px] text-slate-400">/100</span>
        </div>

        {isUserWinning && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-900/90 border border-emerald-500 text-emerald-200 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            Winning Bidder
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>{auction.year} • {auction.mileage.toLocaleString()} mi</span>
            <span>{auction.engine_cc}cc • {auction.horsepower} HP</span>
          </div>

          <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 font-display">
            {auction.title}
          </h3>
        </div>

        {/* Pricing Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
              {isLive ? 'Current Highest Bid' : 'Final Price'}
            </div>
            <div className="font-mono text-2xl font-black text-white flex items-baseline gap-1">
              ${auction.current_price.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span className={auction.reserve_met ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {auction.reserve_met ? 'Reserve Met' : 'Reserve In Play'}
              </span>
            </div>
          </div>

          <button className="flex items-center justify-center p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 transition-all">
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
