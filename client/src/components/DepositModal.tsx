import React, { useState } from 'react';
import { X, Wallet, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DepositModalProps {
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ onClose }) => {
  const { user, depositFunds } = useAuth();
  const [amount, setAmount] = useState<number>(25000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const presets = [10000, 25000, 50000, 100000];

  const handleDeposit = async () => {
    setIsSubmitting(true);
    try {
      await depositFunds(amount);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {}
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white font-display">Deposit Escrow Funds</h3>
              <p className="text-xs text-slate-400 font-mono">
                Current: ${(user?.deposit_balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          <div className="text-xs text-slate-300">
            MotoBid requires registered bidders to maintain sufficient escrow balance (minimum 10% credit buffer) to place high-value bids.
          </div>

          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${
                  amount === p
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                +${p.toLocaleString()}
              </button>
            ))}
          </div>

          {success ? (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Funds deposited successfully!
            </div>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-sans text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Processing...' : `Deposit $${amount.toLocaleString()} Now`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
