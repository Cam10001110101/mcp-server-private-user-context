import Database from 'better-sqlite3';
import CryptoJS from 'crypto-js';
import { randomBytes } from 'crypto';
import { PersonalContextError } from './types.js';
export class PersonalContextDB {
    db;
    encryptionKey;
    constructor(dbPath, encryptionKey) {
        this.db = new Database(dbPath);
        this.encryptionKey = encryptionKey;
        this.initialize();
    }
    initialize() {
        // Create tables if they don't exist
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS personal_info (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        relationship TEXT,
        encrypted_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_personal_info_type ON personal_info(type);
      CREATE INDEX IF NOT EXISTS idx_personal_info_name ON personal_info(name);
    `);
    }
    encrypt(data) {
        const iv = randomBytes(16).toString('hex');
        const content = CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey, {
            iv: CryptoJS.enc.Hex.parse(iv)
        }).toString();
        return { iv, content };
    }
    decrypt(encrypted) {
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted.content, this.encryptionKey, {
                iv: CryptoJS.enc.Hex.parse(encrypted.iv)
            });
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        }
        catch (error) {
            throw new PersonalContextError('Failed to decrypt data', 'DECRYPT_ERROR');
        }
    }
    async addPersonalInfo(info) {
        const id = randomBytes(16).toString('hex');
        const now = new Date().toISOString();
        const encrypted = this.encrypt(info.data);
        const stmt = this.db.prepare(`
      INSERT INTO personal_info (id, type, name, relationship, encrypted_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        try {
            stmt.run(id, info.type, info.name, info.relationship || null, JSON.stringify(encrypted), now, now);
            return {
                id,
                type: info.type,
                name: info.name,
                relationship: info.relationship,
                data: info.data,
                createdAt: now,
                updatedAt: now
            };
        }
        catch (error) {
            throw new PersonalContextError('Failed to add personal info', 'DB_ERROR');
        }
    }
    async updatePersonalInfo(id, data) {
        const existing = this.getPersonalInfo({ id });
        if (!existing) {
            throw new PersonalContextError('Personal info not found', 'NOT_FOUND');
        }
        const updatedData = { ...existing.data, ...data };
        const encrypted = this.encrypt(updatedData);
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      UPDATE personal_info
      SET encrypted_data = ?, updated_at = ?
      WHERE id = ?
    `);
        try {
            stmt.run(JSON.stringify(encrypted), now, id);
            return {
                ...existing,
                data: updatedData,
                updatedAt: now
            };
        }
        catch (error) {
            throw new PersonalContextError('Failed to update personal info', 'DB_ERROR');
        }
    }
    getPersonalInfo(query) {
        let sql = 'SELECT * FROM personal_info WHERE 1=1';
        const params = [];
        if (query.id) {
            sql += ' AND id = ?';
            params.push(query.id);
        }
        if (query.type) {
            sql += ' AND type = ?';
            params.push(query.type);
        }
        if (query.name) {
            sql += ' AND name = ?';
            params.push(query.name);
        }
        if (query.relationship) {
            sql += ' AND relationship = ?';
            params.push(query.relationship);
        }
        const stmt = this.db.prepare(sql);
        const row = stmt.get(...params);
        if (!row) {
            return null;
        }
        const encrypted = JSON.parse(row.encrypted_data);
        const data = this.decrypt(encrypted);
        return {
            id: row.id,
            type: row.type,
            name: row.name,
            relationship: row.relationship || undefined,
            data,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    searchPersonalInfo(query) {
        const stmt = this.db.prepare(`
      SELECT * FROM personal_info
      WHERE name LIKE ? OR relationship LIKE ?
    `);
        const searchPattern = `%${query}%`;
        const rows = stmt.all(searchPattern, searchPattern);
        return rows.map(row => {
            const encrypted = JSON.parse(row.encrypted_data);
            const data = this.decrypt(encrypted);
            return {
                id: row.id,
                type: row.type,
                name: row.name,
                relationship: row.relationship || undefined,
                data,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        });
    }
    close() {
        this.db.close();
    }
}
