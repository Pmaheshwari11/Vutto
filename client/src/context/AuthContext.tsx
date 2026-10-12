import React, { createContext, useContext, useState, useEffect } from 'react';
import { SafeUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: 'BUYER' | 'SELLER') => Promise<void>;
  logout: () => void;
  quickSwitch: (accountType: 'ADMIN' | 'BUYER_1' | 'BUYER_2' | 'SELLER') => Promise<void>;
  depositFunds: (amount: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const PRESET_ACCOUNTS = {
  ADMIN: { email: 'admin@motobid.io', pass: 'AdminPass123!', label: 'System Admin (Full Access)' },
  BUYER_1: { email: 'alex.rider@motobid.io', pass: 'BuyerPass123!', label: 'Alex Rider (Pro Buyer 1)' },
  BUYER_2: { email: 'sarah.moto@motobid.io', pass: 'BuyerPass123!', label: 'Sarah Speed (Pro Buyer 2)' },
  SELLER: { email: 'marcus.dealer@motobid.io', pass: 'SellerPass123!', label: 'Marcus Motowerks (Verified Dealer)' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('motobid_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('motobid_token');
      if (storedToken) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('motobid_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Auto log in as Buyer 1 for instant demo frictionless browsing if no session
        try {
          const res = await api.auth.login({
            email: PRESET_ACCOUNTS.BUYER_1.email,
            password: PRESET_ACCOUNTS.BUYER_1.pass
          });
          localStorage.setItem('motobid_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch {}
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('motobid_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (username: string, email: string, password: string, role?: 'BUYER' | 'SELLER') => {
    const res = await api.auth.register({ username, email, password, role });
    localStorage.setItem('motobid_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('motobid_token');
    setToken(null);
    setUser(null);
  };

  const quickSwitch = async (accountType: keyof typeof PRESET_ACCOUNTS) => {
    const preset = PRESET_ACCOUNTS[accountType];
    await login(preset.email, preset.pass);
  };

  const depositFunds = async (amount: number) => {
    const res = await api.auth.deposit(amount);
    setUser(res.user);
  };

  const refreshProfile = async () => {
    if (token) {
      const res = await api.auth.getMe();
      setUser(res.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        quickSwitch,
        depositFunds,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
