import { join } from 'path';
import { randomBytes } from 'crypto';

// Generate a random encryption key if not provided
const encryptionKey = process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex');

// Set database path
const dbPath = join(process.cwd(), 'data', 'personal-context.db');

export default {
  encryptionKey,
  dbPath,
};
