import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Wrench, Gauge, FileText } from 'lucide-react';
import { Auction } from '../types';

interface ConditionReportModalProps {
  auction: Auction;
  onClose: () => void;
}

export const ConditionReportModal: React.FC<ConditionReportModalProps> = ({ auction, onClose }) => {
  const report = auction.inspection_report;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">
                100-Point Inspection Report
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                VIN: {auction.vin} • Inspected by MotoBid Certified Master Tech
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Score Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800">
            <div className="flex items-center gap-4 mb-3 sm:mb-0">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-2xl font-black">
                {auction.condition_score}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Overall Mechanical Score</div>
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Grade A — Collector & Track Ready
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {report.clean_title && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-600/50 text-emerald-300">
                  ✓ Clean Title
                </span>
              )}
              {report.service_history_verified && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-600/50 text-cyan-300">
                  ✓ Service Verified
                </span>
              )}
            </div>
          </div>

          {/* Core Systems Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-amber-400" />
                Powertrain & Mechanical
              </div>

              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Engine Compression</span>
                <span className="font-semibold text-emerald-400">{report.engine_compression}</span>
              </div>

              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Transmission & Clutch</span>
                <span className="font-semibold text-emerald-400">{report.transmission}</span>
              </div>

              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-300">Frame & Chassis Alignment</span>
                <span className="font-semibold text-emerald-400">{report.frame_alignment}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Wear Items & Electrical
              </div>

              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Brake Pads Life</span>
                <span className="font-mono font-semibold text-emerald-400">{report.brake_pads_percent}%</span>
              </div>

              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Front Tyre Tread</span>
                <span className="font-mono font-semibold text-white">{report.front_tyre_tread_mm} mm</span>
              </div>

              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-300">Rear Tyre Tread</span>
                <span className="font-mono font-semibold text-white">{report.rear_tyre_tread_mm} mm</span>
              </div>
            </div>
          </div>

          {/* Mechanic Inspection Notes */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-amber-400" />
              Inspector Observations & Diagnostics
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-sans italic">
              "{report.notes}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
