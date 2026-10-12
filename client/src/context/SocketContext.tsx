import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { soundManager } from '../services/audio';

interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  timestamp: string;
}

interface SocketContextType {
  isConnected: boolean;
  subscribeToAuction: (auctionId: string) => void;
  unsubscribeFromAuction: (auctionId: string) => void;
  lastMessage: any;
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSubsRef = useRef<Set<string>>(new Set());

  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const newToast: ToastNotification = {
      ...toast,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString()
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Authenticate socket if user logged in
        if (user) {
          ws.send(JSON.stringify({ event: 'AUTH', user_id: user.id }));
        }

        // Resubscribe to active auction rooms
        activeSubsRef.current.forEach((auctionId) => {
          ws.send(JSON.stringify({ event: 'SUBSCRIBE', auction_id: auctionId }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastMessage(payload);

          // Audio and Toast reactions
          if (payload.event === 'BID_PLACED') {
            soundManager.playBidSound();
            if (payload.data?.extended) {
              addToast({
                type: 'warning',
                title: '⚡ Anti-Sniping Soft Close Triggered!',
                message: `Auction extended by 60s! New deadline: ${new Date(payload.data.new_end_time).toLocaleTimeString()}`
              });
            }
          } else if (payload.event === 'OUTBID') {
            soundManager.playOutbidWarning();
            addToast({
              type: 'danger',
              title: '🚨 OUTBID ALERT!',
              message: payload.data?.message || 'Another bidder has outbid you!'
            });
          } else if (payload.event === 'AUCTION_EXTENDED') {
            soundManager.playBidSound();
            addToast({
              type: 'warning',
              title: '⏱️ Auction Extended',
              message: `Deadline extended to ${new Date(payload.data?.new_end_time).toLocaleTimeString()}`
            });
          } else if (payload.event === 'STATUS_CHANGED') {
            if (payload.data?.status === 'ENDED') {
              soundManager.playGavelStrike();
              addToast({
                type: 'info',
                title: '🔨 Gavel Struck — Auction Ended',
                message: payload.data?.message || 'Bidding has concluded.'
              });
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Retry connection in 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Update AUTH when user changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({ event: 'AUTH', user_id: user.id }));
    }
  }, [user]);

  const subscribeToAuction = (auctionId: string) => {
    activeSubsRef.current.add(auctionId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'SUBSCRIBE', auction_id: auctionId }));
    }
  };

  const unsubscribeFromAuction = (auctionId: string) => {
    activeSubsRef.current.delete(auctionId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'UNSUBSCRIBE', auction_id: auctionId }));
    }
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        subscribeToAuction,
        unsubscribeFromAuction,
        lastMessage,
        toasts,
        removeToast
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
