import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  User,
  DollarSign,
  AlertCircle,
  Trophy,
  CheckCircle2,
  Wrench,
  Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Auction, Bid } from '../types';
import { CountdownTimer } from './CountdownTimer';
import { ConditionReportModal } from './ConditionReportModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { soundManager } from '../services/audio';

interface LiveAuctionArenaProps {
  auction: Auction;
  onBack: () => void;
  onAuctionUpdated: (updated: Auction) => void;
}

export const LiveAuctionArena: React.FC<LiveAuctionArenaProps> = ({
  auction: initialAuction,
  onBack,
  onAuctionUpdated
}) => {
  const { user } = useAuth();
  const { subscribeToAuction, unsubscribeFromAuction, lastMessage } = useSocket();

  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>(initialAuction.images[0]);
  const [showConditionModal, setShowConditionModal] = useState<boolean>(false);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // Minimum required bid
  const minRequiredBid = auction.current_price + auction.min_increment;
  const isWinning = Boolean(user && auction.highest_bidder_id === user.id);
  const isLive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';

  // Subscribe to auction's real-time WebSocket channel
  useEffect(() => {
    subscribeToAuction(auction.id);
    return () => {
      unsubscribeFromAuction(auction.id);
    };
  }, [auction.id]);

  // Fetch initial bid history
  useEffect(() => {
    const fetchBids = async () => {
      try {
        const res = await api.auctions.getBids(auction.id);
        setBids(res.bids);
      } catch {}
    };
    fetchBids();
  }, [auction.id]);

  // Handle incoming real-time socket updates for this auction
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.auction_id === auction.id || lastMessage.data?.auction_id === auction.id) {
      if (lastMessage.event === 'BID_PLACED') {
        const data = lastMessage.data;
        setBids((prev) => [data.bid, ...prev.filter((b) => b.id !== data.bid.id)]);

        const updatedAuction: Auction = {
          ...auction,
          current_price: data.current_price,
          highest_bidder_id: data.highest_bidder_id,
          highest_bidder_name: data.highest_bidder_name,
          bid_count: data.bid_count,
          reserve_met: data.reserve_met,
          end_time: data.new_end_time || auction.end_time,
          extension_count: data.extension_count ?? auction.extension_count,
          status: data.extended ? 'EXTENDED' : auction.status
        };

        setAuction(updatedAuction);
        onAuctionUpdated(updatedAuction);

        // Confetti if current user placed the winning bid
        if (user && data.highest_bidder_id === user.id) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        }
      } else if (lastMessage.event === 'AUCTION_EXTENDED') {
        const updated = {
          ...auction,
          end_time: lastMessage.data.new_end_time,
          extension_count: lastMessage.data.extension_count,
          status: 'EXTENDED' as const
        };
        setAuction(updated);
        onAuctionUpdated(updated);
      } else if (lastMessage.event === 'STATUS_CHANGED') {
        const updated = {
          ...auction,
          status: lastMessage.data.status,
          reserve_met: lastMessage.data.reserve_met ?? auction.reserve_met
        };
        setAuction(updated);
        onAuctionUpdated(updated);
      }
    }
  }, [lastMessage, user]);

  const handlePlaceBid = async (amount: number) => {
    if (!user) {
      setBidError('Please sign in or select an account to place a bid');
      return;
    }

    setBidError(null);
    setBidSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await api.bids.placeBid(auction.id, amount);
      setBidSuccess(res.message);
      setCustomBidAmount('');

      // Sound and feedback
      soundManager.playBidSound();
      if (res.extended) {
        soundManager.playBidSound();
      }
    } catch (err: any) {
      setBidError(err.message);
      soundManager.playOutbidWarning();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick bid buttons
  const quickBidIncrements = [
    auction.min_increment,
    auction.min_increment * 2,
    auction.min_increment * 4,
    1000
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Lobby
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-slate-900 border border-slate-700 text-amber-400 uppercase">
            {auction.category}
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            VIN: {auction.vin}
          </span>
        </div>
      </div>

      {/* Main Grid: Gallery & Bidding Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Gallery & Bike Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Image Showcase */}
          <div className="glass-panel overflow-hidden relative">
            <div className="relative h-80 sm:h-96 w-full bg-slate-950 overflow-hidden">
              <img
                src={selectedImage}
                alt={auction.title}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

              {/* Status Badge Over Image */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {isLive ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-dot" />
                    LIVE AUCTION
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-slate-900 border border-slate-700 text-slate-400">
                    {auction.status}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {auction.images.length > 1 && (
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex gap-2 overflow-x-auto">
                {auction.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                      selectedImage === img
                        ? 'border-amber-500 scale-105 shadow-md shadow-amber-500/20'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Motorcycle Specification Sheet */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
                  {auction.title}
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Listed by {auction.seller_name || 'Verified Dealership'}
                </p>
              </div>

              <button
                onClick={() => setShowConditionModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Inspection Score: {auction.condition_score}/100
              </button>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Engine CC</div>
                <div className="text-lg font-bold text-white font-mono">{auction.engine_cc} cc</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Horsepower</div>
                <div className="text-lg font-bold text-white font-mono">{auction.horsepower} HP</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Mileage</div>
                <div className="text-lg font-bold text-white font-mono">{auction.mileage.toLocaleString()} mi</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Model Year</div>
                <div className="text-lg font-bold text-white font-mono">{auction.year}</div>
              </div>
            </div>

            {/* Inspection highlights */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Compression: {auction.inspection_report.engine_compression}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Brake Pads: {auction.inspection_report.brake_pads_percent}%</span>
              </div>
              <button
                onClick={() => setShowConditionModal(true)}
                className="text-amber-400 hover:underline font-semibold"
              >
                Full Inspection Details →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Bidding Cockpit & Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Bidding Card */}
          <div className="glass-panel p-6 space-y-5 border-amber-500/20 shadow-xl relative overflow-hidden">
            {/* Countdown Header */}
            <CountdownTimer
              endTime={auction.end_time}
              status={auction.status}
              extensionCount={auction.extension_count}
              size="lg"
            />

            {/* Anti-Sniping Explanation Banner */}
            {isLive && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Soft-Close Anti-Sniping Protection: </span>
                  Bids placed within the final 30 seconds automatically extend the auction by 60 seconds to guarantee fair price discovery.
                </div>
              </div>
            )}

            {/* Price Gauge */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider font-mono text-slate-400">
                  Current Highest Bid
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-white flex items-baseline gap-1">
                  ${auction.current_price.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                  <span>{auction.bid_count} total bids</span>
                  <span>•</span>
                  <span className={auction.reserve_met ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {auction.reserve_met ? '✓ Reserve Met' : 'Reserve In Play'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs uppercase font-mono text-slate-400">Min. Next Bid</div>
                <div className="text-lg font-bold font-mono text-amber-400">
                  ${minRequiredBid.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  +${auction.min_increment} increment
                </div>
              </div>
            </div>

            {/* Live Winning / Outbid Feedback Banner */}
            {user && (
              <div>
                {isWinning ? (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/80 text-emerald-200 text-xs font-semibold flex items-center gap-2 glow-emerald">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span>You are currently the highest bidder! Hold on for the win!</span>
                  </div>
                ) : bids.some((b) => b.bidder_id === user.id) ? (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/80 text-rose-200 text-xs font-semibold flex items-center gap-2 glow-rose animate-pulse">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>You have been outbid! Submit a higher bid to reclaim lead.</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Bid Action Form */}
            {isLive ? (
              <div className="space-y-4">
                {/* 4 Quick Bid Buttons */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                    Instant Quick Bid:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quickBidIncrements.map((inc) => {
                      const quickAmount = auction.current_price + inc;
                      return (
                        <button
                          key={inc}
                          disabled={isSubmitting || isWinning}
                          onClick={() => handlePlaceBid(quickAmount)}
                          className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-500/10 border border-slate-700 hover:border-amber-500/50 text-white hover:text-amber-400 text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center"
                        >
                          <span>+${inc}</span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            (${quickAmount.toLocaleString()})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Bid Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Or enter custom bid:</span>
                    <span>Min: ${minRequiredBid.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder={minRequiredBid.toString()}
                        value={customBidAmount}
                        onChange={(e) => setCustomBidAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none transition-colors text-sm"
                      />
                    </div>
                    <button
                      disabled={isSubmitting || isWinning || !customBidAmount || Number(customBidAmount) < minRequiredBid}
                      onClick={() => handlePlaceBid(Number(customBidAmount))}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                    >
                      {isSubmitting ? 'Submitting...' : 'Bid'}
                    </button>
                  </div>
                </div>

                {/* Status messages */}
                {bidError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{bidError}</span>
                  </div>
                )}
                {bidSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{bidSuccess}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div className="text-sm font-bold text-slate-300">
                  {auction.status === 'ENDED' || auction.status === 'SETTLED'
                    ? `Auction Closed — Winning Bid $${auction.current_price.toLocaleString()}`
                    : 'Bidding is not currently active'}
                </div>
              </div>
            )}

            {/* Admin Live Controls Overlay */}
            {user?.role === 'ADMIN' && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center justify-between">
                  <span>Admin Operator Controls</span>
                  <span className="text-[10px] text-slate-400">Reserve: ${auction.reserve_price.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      const res = await api.admin.extendAuction(auction.id, 60);
                      setAuction(res.auction);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    +1m Extend
                  </button>
                  <button
                    onClick={async () => {
                      const res = await api.admin.extendAuction(auction.id, 300);
                      setAuction(res.auction);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    +5m Extend
                  </button>
                  <button
                    onClick={async () => {
                      const res = await api.admin.forceClose(auction.id);
                      setAuction(res.auction);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-xs text-rose-300"
                  >
                    Force Close
                  </button>
                  <button
                    onClick={async () => {
                      // Trigger synthetic bot counter-bid
                      await api.admin.simulateBotBid(
                        auction.id,
                        auction.highest_bidder_id === 'usr_buyer_01' ? 'sarah_speed' : 'alex_rider',
                        500
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-1"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Simulate Bot Counter-Bid
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Bid History Stream */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                  Live Bid Activity Feed
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {bids.length} bid{bids.length !== 1 ? 's' : ''} placed
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {bids.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No bids recorded yet. Be the first to place a bid!
                </div>
              ) : (
                bids.map((bid, index) => {
                  const isTopBid = index === 0;
                  const isCurrentUsersBid = user && bid.bidder_id === user.id;

                  return (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isTopBid
                          ? 'bg-slate-900/90 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300">
                          #{bid.sequence_num}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            <span>{bid.bidder_name}</span>
                            {isCurrentUsersBid && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(bid.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono text-sm font-bold ${
                            isTopBid ? 'text-amber-400' : 'text-slate-300'
                          }`}
                        >
                          ${bid.amount.toLocaleString()}
                        </div>
                        {isTopBid && (
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                            <Trophy className="w-3 h-3" />
                            Leader
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 100-Point Inspection Modal */}
      {showConditionModal && (
        <ConditionReportModal
          auction={auction}
          onClose={() => setShowConditionModal(false)}
        />
      )}
    </div>
  );
};
