import jwt from 'jsonwebtoken';
import { AuthorizationError } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

export class AuthManager {
  verifyToken(token: string): any {
    try {
      if (!token.startsWith('Bearer ')) {
        throw new AuthorizationError('Invalid token format', 'INVALID_TOKEN');
      }

      const tokenString = token.slice(7); // Remove 'Bearer ' prefix
      return jwt.verify(tokenString, JWT_SECRET);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError('Invalid token', 'INVALID_TOKEN');
    }
  }

  validateScope(token: any, requiredScope: string): boolean {
    if (!token.scopes || !Array.isArray(token.scopes)) {
      return false;
    }
    return token.scopes.includes(requiredScope);
  }

  generateToken(userId: string, scopes: string[]): string {
    return jwt.sign(
      {
        userId,
        scopes,
      },
      JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );
  }
}
