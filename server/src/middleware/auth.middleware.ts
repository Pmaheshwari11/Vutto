import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { SafeUser, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
    return;
  }

  const token = authHeader.substring(7);
  const user = authService.verifyToken(token);

  if (!user) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  // Refresh user deposit & latest status from DB
  const dbUser = authService.getUserById(user.id);
  if (!dbUser) {
    res.status(401).json({ error: 'User account no longer exists.' });
    return;
  }

  req.user = dbUser;
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = authService.verifyToken(token);
    if (user) {
      const dbUser = authService.getUserById(user.id);
      if (dbUser) req.user = dbUser;
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized. Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden. Role '${req.user.role}' is not authorized. Required: ${roles.join(' or ')}`
      });
      return;
    }

    next();
  };
}
