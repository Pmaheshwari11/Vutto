import { Auction, Bid, SafeUser, AuditLog, SystemMetricsSnapshot } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('motobid_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({ error: 'Invalid JSON response from server' }));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Authentication
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      return handleResponse<{ token: string; user: SafeUser }>(res);
    },

    register: async (data: { username: string; email: string; password: string; role?: 'BUYER' | 'SELLER' }) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse<{ token: string; user: SafeUser }>(res);
    },

    getMe: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<{ user: SafeUser }>(res);
    },

    deposit: async (amount: number) => {
      const res = await fetch(`${API_BASE}/auth/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ amount })
      });
      return handleResponse<{ message: string; user: SafeUser }>(res);
    }
  },

  // Auctions
  auctions: {
    list: async (filters?: { status?: string; category?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.search) params.set('search', filters.search);

      const url = `${API_BASE}/auctions${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { headers: { ...getAuthHeader() } });
      return handleResponse<{ auctions: Auction[]; count: number }>(res);
    },

    getById: async (id: string) => {
      const res = await fetch(`${API_BASE}/auctions/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<{ auction: Auction; bids: Bid[] }>(res);
    },

    getBids: async (id: string) => {
      const res = await fetch(`${API_BASE}/auctions/${id}/bids`);
      return handleResponse<{ bids: Bid[]; count: number }>(res);
    },

    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/auctions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse<{ auction: Auction }>(res);
    }
  },

  // Bidding
  bids: {
    placeBid: async (auctionId: string, amount: number) => {
      const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ amount })
      });
      return handleResponse<{
        success: boolean;
        message: string;
        bid: Bid;
        auction: Auction;
        extended: boolean;
        newEndTime?: string;
      }>(res);
    }
  },

  // Admin SRE Operations
  admin: {
    getMetrics: async () => {
      const res = await fetch(`${API_BASE}/admin/metrics`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<{ metrics: SystemMetricsSnapshot }>(res);
    },

    getAuditLogs: async (limit = 100, action?: string) => {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (action) params.set('action', action);

      const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<{ logs: AuditLog[]; count: number }>(res);
    },

    extendAuction: async (auctionId: string, seconds = 60) => {
      const res = await fetch(`${API_BASE}/admin/auctions/${auctionId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ seconds })
      });
      return handleResponse<{ success: boolean; auction: Auction }>(res);
    },

    forceClose: async (auctionId: string) => {
      const res = await fetch(`${API_BASE}/admin/auctions/${auctionId}/force-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      return handleResponse<{ success: boolean; auction: Auction }>(res);
    },

    simulateBotBid: async (auctionId: string, bidderUsername: string, increment = 500) => {
      const res = await fetch(`${API_BASE}/admin/simulate-bot-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ auctionId, bidderUsername, increment })
      });
      return handleResponse<{ success: boolean; message: string; result: any }>(res);
    }
  }
};
