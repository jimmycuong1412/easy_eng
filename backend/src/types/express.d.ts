/**
 * Express Request Type Extensions
 * 
 * Augments Express Request with custom properties
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'student' | 'teacher' | 'admin';
      };
    }
  }
}

export {};
