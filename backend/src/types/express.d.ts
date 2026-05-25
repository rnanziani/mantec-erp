import type { AuthUser } from '../middleware/authMiddleware.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export {};
