import { AuthManager } from './build/auth.js';

const auth = new AuthManager();
const token = auth.generateToken('test', ['write:users', 'read:users']);
console.log('Test token:', token);
