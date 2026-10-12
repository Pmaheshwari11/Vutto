import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

interface CountdownTimerProps {
  endTime: string;
  status: string;
  extensionCount?: number;
  size?: 'sm' | 'md' | 'lg';
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  status,
  extensionCount = 0,
  size = 'md',
  onExpire
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    hours: number;
    minutes: number;
    seconds: number;
    isUrgent: boolean;
    isAntiSnipeActive: boolean;
  }>({
    totalMs: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isUrgent: false,
    isAntiSnipeActive: false
  });

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(endTime).getTime() - Date.now();

      if (difference <= 0 || status === 'ENDED' || status === 'SETTLED' || status === 'UNSOLD') {
        setTimeLeft({
          totalMs: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isUrgent: false,
          isAntiSnipeActive: false
        });
        if (difference <= 0 && (status === 'ACTIVE' || status === 'EXTENDED') && onExpire) {
          onExpire();
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        totalMs: difference,
        hours,
        minutes,
        seconds,
        isUrgent: difference <= 120000, // < 2 minutes
        isAntiSnipeActive: difference <= 30000 || status === 'EXTENDED' // < 30s or already extended
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 250);
    return () => clearInterval(interval);
  }, [endTime, status, onExpire]);

  if (status === 'ENDED' || status === 'SETTLED') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-mono text-xs uppercase tracking-wider font-semibold">
        <Clock className="w-3.5 h-3.5" />
        Auction Closed
      </div>
    );
  }

  if (status === 'UNSOLD') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/40 text-rose-300 font-mono text-xs uppercase tracking-wider">
        Reserve Not Met
      </div>
    );
  }

  if (status === 'SCHEDULED') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono text-xs uppercase tracking-wider">
        Starts Soon
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Small size for cards
  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs font-semibold ${
          timeLeft.isAntiSnipeActive
            ? 'bg-rose-950/80 border border-rose-500 text-rose-300 pulse-anti-sniping'
            : timeLeft.isUrgent
            ? 'bg-amber-950/60 border border-amber-600/50 text-amber-300'
            : 'bg-slate-900/90 border border-slate-700 text-slate-200'
        }`}
      >
        <Clock className={`w-3.5 h-3.5 ${timeLeft.isAntiSnipeActive ? 'text-rose-400 animate-spin' : ''}`} />
        <span>
          {timeLeft.hours > 0 ? `${pad(timeLeft.hours)}:` : ''}
          {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
        {extensionCount > 0 && (
          <span className="text-[10px] px-1 py-0.2 bg-rose-800/80 rounded text-rose-200 font-sans">
            +{extensionCount}
          </span>
        )}
      </div>
    );
  }

  // Large size for Live Arena
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex items-center gap-3 px-6 py-3 rounded-xl border backdrop-blur-md transition-all ${
          timeLeft.isAntiSnipeActive
            ? 'bg-rose-950/50 border-rose-500 text-rose-200 pulse-anti-sniping glow-rose'
            : timeLeft.isUrgent
            ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 glow-amber'
            : 'bg-slate-900/80 border-slate-700/80 text-slate-100'
        }`}
      >
        <Clock
          className={`w-6 h-6 ${
            timeLeft.isAntiSnipeActive ? 'text-rose-400 animate-pulse' : 'text-amber-400'
          }`}
        />

        <div className="flex items-baseline gap-2 font-mono text-2xl md:text-3xl font-bold tracking-tight">
          {timeLeft.hours > 0 && (
            <>
              <span>{pad(timeLeft.hours)}</span>
              <span className="text-xs text-slate-400 font-sans">h</span>
            </>
          )}
          <span>{pad(timeLeft.minutes)}</span>
          <span className="text-xs text-slate-400 font-sans">m</span>
          <span className={timeLeft.isAntiSnipeActive ? 'text-rose-400' : 'text-amber-400'}>
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-xs text-slate-400 font-sans">s</span>
        </div>

        {timeLeft.isAntiSnipeActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600/30 border border-rose-500/50 rounded-md text-rose-300 text-xs font-sans font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            Soft-Close Active
          </div>
        )}
      </div>

      {extensionCount > 0 && (
        <span className="mt-1.5 text-xs text-rose-400 font-medium">
          Extended {extensionCount} time{extensionCount > 1 ? 's' : ''} via Anti-Sniping Protection
        </span>
      )}
    </div>
  );
};
