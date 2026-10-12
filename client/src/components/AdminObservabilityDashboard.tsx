import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Zap,
  ShieldAlert,
  Clock,
  Terminal,
  Database,
  RefreshCw,
  Search,
  Filter,
  Bot,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { SystemMetricsSnapshot, AuditLog, Auction } from '../types';

export const AdminObservabilityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetricsSnapshot | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [promMetricsText, setPromMetricsText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'metrics' | 'audit' | 'prometheus' | 'simulator'>('metrics');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');

  // Bot Simulator State
  const [simAuctionId, setSimAuctionId] = useState<string>('');
  const [simBot, setSimBot] = useState<'alex_rider' | 'sarah_speed'>('alex_rider');
  const [simIncrement, setSimIncrement] = useState<number>(500);
  const [simStatus, setSimStatus] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [mRes, aRes, aucRes, promRes] = await Promise.all([
        api.admin.getMetrics(),
        api.admin.getAuditLogs(100),
        api.auctions.list(),
        fetch('/metrics').then((r) => r.text()).catch(() => '')
      ]);

      setMetrics(mRes.metrics);
      setAuditLogs(aRes.logs);
      setAuctions(aucRes.auctions);
      setPromMetricsText(promRes);

      if (!simAuctionId && aucRes.auctions.length > 0) {
        const live = aucRes.auctions.find((a) => a.status === 'ACTIVE' || a.status === 'EXTENDED');
        if (live) setSimAuctionId(live.id);
      }
    } catch {}
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000); // Polling telemetry every 3s
    return () => clearInterval(interval);
  }, []);

  const handleSimulateBot = async () => {
    if (!simAuctionId) return;
    setSimStatus('Simulating concurrent bot bid...');
    try {
      const res = await api.admin.simulateBotBid(simAuctionId, simBot, simIncrement);
      setSimStatus(`✓ ${res.message}`);
      fetchDashboardData();
    } catch (err: any) {
      setSimStatus(`Error: ${err.message}`);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      auditSearch === '' ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target_id.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.actor_id && log.actor_id.toLowerCase().includes(auditSearch.toLowerCase()));

    const matchesAction = actionFilter === '' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel border-cyan-500/30">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black font-display text-white tracking-tight">
              Production Observability & SRE Command Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time telemetry, RED/USE metrics, Prometheus exporter, and immutable audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'metrics'
              ? 'bg-amber-500 text-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Metrics
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'simulator'
              ? 'bg-amber-500 text-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Bot className="w-4 h-4" />
          Synthetic Bot Simulator
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Audit Trail ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('prometheus')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'prometheus'
              ? 'bg-amber-500 text-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Server className="w-4 h-4" />
          Prometheus Exporter
        </button>
      </div>

      {/* TAB 1: Live Metrics */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          {/* Top Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 space-y-2 border-emerald-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Active WebSocket Clients</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black font-mono text-white">
                {metrics.active_ws_connections}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium">
                Live bidirectional RFC 6455 sockets
              </div>
            </div>

            <div className="glass-panel p-5 space-y-2 border-amber-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Bids Processed (Total)</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black font-mono text-white">
                {metrics.total_bids_processed}
              </div>
              <div className="text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">{metrics.successful_bids} accepted</span> •{' '}
                <span className="text-rose-400">{metrics.rejected_bids} rejected</span>
              </div>
            </div>

            <div className="glass-panel p-5 space-y-2 border-rose-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Anti-Sniping Extensions</span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-black font-mono text-white">
                {metrics.anti_sniping_extensions}
              </div>
              <div className="text-[11px] text-rose-300 font-medium">
                Soft-close triggers preventing bot snipes
              </div>
            </div>

            <div className="glass-panel p-5 space-y-2 border-cyan-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Bid Lock Latency (p95)</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-black font-mono text-cyan-400">
                {metrics.p95_bid_latency_ms} ms
              </div>
              <div className="text-[11px] text-slate-400">
                p50: {metrics.p50_bid_latency_ms}ms • p99: {metrics.p99_bid_latency_ms}ms
              </div>
            </div>
          </div>

          {/* Node.js Runtime & Persistence Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Database className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                  Database & Storage Architecture
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Storage Engine:</span>
                  <span className="font-mono text-white">SQLite 3.45 with WAL (Write-Ahead Log)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Concurrency Model:</span>
                  <span className="font-mono text-emerald-400 font-semibold">In-Memory Per-Auction Mutex Lock</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Synchronous Mode:</span>
                  <span className="font-mono text-white">NORMAL (High Performance)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Active Live Auctions:</span>
                  <span className="font-mono text-white font-bold">{metrics.active_auctions}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                  Node.js Runtime Footprint
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Process Uptime:</span>
                  <span className="font-mono text-white">{metrics.uptime_seconds} seconds</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Memory Heap Used:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{metrics.memory_heap_mb} MB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Memory RSS:</span>
                  <span className="font-mono text-white">{metrics.memory_rss_mb} MB</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Event Loop Lag:</span>
                  <span className="font-mono text-emerald-400 font-semibold">&lt; 1.0 ms (Optimal)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Synthetic Bot Simulator */}
      {activeTab === 'simulator' && (
        <div className="glass-panel p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white font-display">
                Synthetic Load & Anti-Sniping Testing Generator
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Trigger automated concurrent bids from synthetic buyers to test real-time WebSocket broadcasting and anti-sniping soft close live!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Target Auction:</label>
              <select
                value={simAuctionId}
                onChange={(e) => setSimAuctionId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              >
                {auctions.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.status}] {a.title.substring(0, 35)}... (${a.current_price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Synthetic Bot Bidder:</label>
              <select
                value={simBot}
                onChange={(e) => setSimBot(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              >
                <option value="alex_rider">Alex Rider (usr_buyer_01)</option>
                <option value="sarah_speed">Sarah Speed (usr_buyer_02)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Bid Increment ($):</label>
              <input
                type="number"
                value={simIncrement}
                onChange={(e) => setSimIncrement(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSimulateBot}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Dispatch Concurrent Bot Bid Now
            </button>

            {simStatus && (
              <span className="text-xs font-mono text-amber-300">
                {simStatus}
              </span>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Immutable Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by action or ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono"
              >
                <option value="">All Actions</option>
                <option value="BID_PLACED">BID_PLACED</option>
                <option value="BID_PLACED_AND_EXTENDED">BID_PLACED_AND_EXTENDED</option>
                <option value="AUCTION_EXTENDED">AUCTION_EXTENDED</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="AUCTION_CREATED">AUCTION_CREATED</option>
              </select>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredLogs.length} events
            </span>
          </div>

          <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.action.includes('EXTENDED')
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : log.action.includes('BID')
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{log.actor_id || 'SYSTEM'}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {log.target_entity}:{log.target_id.substring(0, 12)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{log.ip_address}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Raw Prometheus Metrics */}
      {activeTab === 'prometheus' && (
        <div className="glass-panel p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
              Raw Prometheus Metrics (/metrics)
            </h3>
            <span className="text-xs font-mono text-emerald-400">Exposition: text/plain</span>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[500px] border border-slate-850">
            {promMetricsText || 'Loading metrics from /metrics...'}
          </pre>
        </div>
      )}
    </div>
  );
};
