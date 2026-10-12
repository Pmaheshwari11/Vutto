import React, { useState, useEffect } from 'react';
import {
  Flame,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  Activity,
  Plus,
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AuctionCard } from './components/AuctionCard';
import { LiveAuctionArena } from './components/LiveAuctionArena';
import { AdminObservabilityDashboard } from './components/AdminObservabilityDashboard';
import { CreateAuctionModal } from './components/CreateAuctionModal';
import { DepositModal } from './components/DepositModal';
import { ToastContainer } from './components/ToastContainer';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { api } from './services/api';
import { Auction } from './types';

export const App: React.FC = () => {
  const { user } = useAuth();
  const { lastMessage } = useSocket();

  const [currentView, setCurrentView] = useState<'lobby' | 'arena' | 'admin'>('lobby');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);

  const fetchAuctions = async () => {
    setIsLoading(true);
    try {
      const res = await api.auctions.list({
        status: statusFilter,
        category: categoryFilter,
        search: searchQuery
      });
      setAuctions(res.auctions);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAuctions();
  }, [statusFilter, categoryFilter]);

  // Handle live global auction updates from WebSocket
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.event === 'BID_PLACED') {
      const data = lastMessage.data;
      setAuctions((prev) =>
        prev.map((auc) => {
          if (auc.id === data.auction_id) {
            return {
              ...auc,
              current_price: data.current_price,
              highest_bidder_id: data.highest_bidder_id,
              highest_bidder_name: data.highest_bidder_name,
              bid_count: data.bid_count,
              reserve_met: data.reserve_met,
              end_time: data.new_end_time || auc.end_time,
              extension_count: data.extension_count ?? auc.extension_count,
              status: data.extended ? 'EXTENDED' : auc.status
            };
          }
          return auc;
        })
      );
    } else if (lastMessage.event === 'STATUS_CHANGED' && lastMessage.data?.auction) {
      const updated = lastMessage.data.auction;
      setAuctions((prev) => {
        const exists = prev.some((a) => a.id === updated.id);
        if (exists) {
          return prev.map((a) => (a.id === updated.id ? updated : a));
        }
        return [updated, ...prev];
      });
    }
  }, [lastMessage]);

  const categories = [
    { id: 'ALL', label: 'All Motorcycles' },
    { id: 'SUPERBIKE', label: 'Superbikes' },
    { id: 'CRUISER', label: 'Cruisers' },
    { id: 'ADVENTURE', label: 'Adventure / Touring' },
    { id: 'CAFE_RACER', label: 'Cafe Racers' },
    { id: 'CLASSIC', label: 'Vintage Classics' }
  ];

  const statuses = [
    { id: 'ALL', label: 'All Auctions' },
    { id: 'LIVE', label: 'Live Now' },
    { id: 'SCHEDULED', label: 'Upcoming' },
    { id: 'ENDED', label: 'Closed' }
  ];

  return (
    <div className="min-h-screen flex flex-col carbon-grid">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view === 'lobby') setSelectedAuction(null);
        }}
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenDeposit={() => setShowDepositModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* VIEW 1: Arena Single Live Auction */}
        {currentView === 'arena' && selectedAuction && (
          <LiveAuctionArena
            auction={selectedAuction}
            onBack={() => {
              setCurrentView('lobby');
              setSelectedAuction(null);
              fetchAuctions();
            }}
            onAuctionUpdated={(updated) => {
              setSelectedAuction(updated);
              setAuctions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            }}
          />
        )}

        {/* VIEW 2: Admin Observability & SRE Dashboard */}
        {currentView === 'admin' && <AdminObservabilityDashboard />}

        {/* VIEW 3: Lobby Auction Grid */}
        {currentView === 'lobby' && (
          <div className="space-y-6">
            {/* Hero Motorsport Feature Banner */}
            <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-6 sm:p-10 shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs uppercase tracking-wider font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  Real-Time Engine with Soft-Close Protection
                </div>

                <h1 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight leading-tight">
                  Premium Used <span className="text-amber-400">Motorcycle</span> Auctions.
                </h1>

                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  Experience instantaneous real-time bidding with microsecond atomic concurrency locks, automated anti-sniping soft closes, and transparent 100-point mechanical inspection reports.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Clean Titles
                  </span>
                  <span>•</span>
                  <span>Sub-Millisecond Concurrency</span>
                  <span>•</span>
                  <span>Soft-Close Active</span>
                </div>
              </div>

              <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none hidden md:block" />
            </div>

            {/* Filters & Search Toolbar */}
            <div className="glass-panel p-4 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchAuctions();
                  }}
                  className="relative w-full md:w-96"
                >
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by make, model (e.g. Ducati, Yamaha)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </form>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                        statusFilter === s.id
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Pills Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80 pb-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      categoryFilter === c.id
                        ? 'bg-slate-800 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auction Grid */}
            {isLoading ? (
              <div className="text-center py-20 text-slate-400 font-mono text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Synchronizing live auction feed...
              </div>
            ) : auctions.length === 0 ? (
              <div className="text-center py-20 glass-panel p-8">
                <p className="text-slate-400 font-medium">No auctions found matching your filter criteria.</p>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setCategoryFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-mono font-bold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    isUserWinning={Boolean(user && auction.highest_bidder_id === user.id)}
                    onSelect={(selected) => {
                      setSelectedAuction(selected);
                      setCurrentView('arena');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MotoBid Production Platform • Software Engineering Internship Submission</span>
          <span>WebSocket RFC 6455 • Prometheus Exporter /metrics • SQLite WAL</span>
        </div>
      </footer>

      {/* Floating Notifications */}
      <ToastContainer />

      {/* Modals */}
      {showCreateModal && (
        <CreateAuctionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newAuction) => {
            setAuctions((prev) => [newAuction, ...prev]);
            setSelectedAuction(newAuction);
            setCurrentView('arena');
          }}
        />
      )}

      {showDepositModal && (
        <DepositModal onClose={() => setShowDepositModal(false)} />
      )}
    </div>
  );
};
