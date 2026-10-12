import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db';
import { CONFIG } from '../config';
import { User, SafeUser } from '../types';
import { auditService } from './audit.service';

export interface AuthTokens {
  token: string;
  user: SafeUser;
}

class AuthService {
  async register(data: {
    username: string;
    email: string;
    password: string;
    role?: 'BUYER' | 'SELLER';
  }, ipAddress = '127.0.0.1'): Promise<AuthTokens> {
    const db = getDb();

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(data.email, data.username);
    if (existing) {
      throw new Error('User with this email or username already exists');
    }

    const id = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const hash = await bcrypt.hash(data.password, 10);
    const role = data.role || 'BUYER';
    const depositBalance = 50000.0;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, deposit_balance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.username, data.email, hash, role, depositBalance, createdAt);

    auditService.record({
      actorId: id,
      actorRole: role,
      action: 'USER_REGISTERED',
      targetEntity: 'USER',
      targetId: id,
      details: { username: data.username, email: data.email, role },
      ipAddress
    });

    const safeUser: SafeUser = {
      id,
      username: data.username,
      email: data.email,
      role,
      deposit_balance: depositBalance,
      created_at: createdAt
    };

    const token = this.generateToken(safeUser);
    return { token, user: safeUser };
  }

  async login(credentials: { email: string; password: string }, ipAddress = '127.0.0.1'): Promise<AuthTokens> {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(credentials.email) as User | undefined;

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isMatch) {
      auditService.record({
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN_FAILED',
        targetEntity: 'USER',
        targetId: user.id,
        details: { email: credentials.email },
        ipAddress
      });
      throw new Error('Invalid email or password');
    }

    auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      targetEntity: 'USER',
      targetId: user.id,
      details: { email: credentials.email },
      ipAddress
    });

    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      deposit_balance: user.deposit_balance,
      created_at: user.created_at
    };

    const token = this.generateToken(safeUser);
    return { token, user: safeUser };
  }

  getUserById(id: string): SafeUser | null {
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, role, deposit_balance, created_at FROM users WHERE id = ?').get(id) as SafeUser | undefined;
    return user || null;
  }

  private generateToken(user: SafeUser): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRES_IN as any }
    );
  }

  verifyToken(token: string): SafeUser | null {
    try {
      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        deposit_balance: 0,
        created_at: ''
      };
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
