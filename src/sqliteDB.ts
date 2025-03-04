import initSqlJs, { Database } from 'sql.js/dist/sql-wasm.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import CryptoJS from 'crypto-js';
import { randomBytes } from 'crypto';
import {
  User,
  Contact,
  Email,
  CalendarItem,
  OAuthToken,
  EncryptedData,
  DBSchema,
  AddUserInput,
  AddContactInput,
  AddEmailInput,
  AddCalendarItemInput,
  AddOAuthTokenInput,
  UpdateEntityInput,
  GetEntityInput,
  PersonalContextError,
} from './types.js';
import config from './config.js';

export class SQLiteDB {
  private db!: Database;
  private encryptionKey: string;
  private dbPath: string;
  private initialized: Promise<void>;

  constructor() {
    this.encryptionKey = config.encryptionKey;
    this.dbPath = config.dbPath;
    this.initialized = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Initialize sql.js with WebAssembly
      const SQL = await initSqlJs({
        locateFile: file => `./node_modules/sql.js/dist/${file}`
      });
      
      // Create database directory if it doesn't exist
      const dbDir = dirname(this.dbPath);
      mkdirSync(dbDir, { recursive: true });
      
      // Create new database
      this.db = new SQL.Database();

      // Initialize schema
      this.initialize();
      
      // Save initial database state
      this.saveDatabase();
    } catch (error) {
      console.error('Database initialization error:', error);
      throw new PersonalContextError('Failed to initialize database: ' + (error instanceof Error ? error.message : String(error)), 'DB_ERROR');
    }
  }

  private saveDatabase() {
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
  }

  private initialize(): void {
    // Create tables if they don't exist
    this.db.exec(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        encrypted_preferences TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Contacts table
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Emails table
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        encrypted_body TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipients TEXT NOT NULL,
        thread_id TEXT,
        labels TEXT NOT NULL,
        encrypted_attachments TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Calendar items table
      CREATE TABLE IF NOT EXISTS calendar_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        encrypted_description TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT,
        attendees TEXT NOT NULL,
        recurrence TEXT,
        encrypted_metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- OAuth tokens table
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        encrypted_tokens TEXT NOT NULL,
        scopes TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Create indexes
    this.db.exec(`
      -- User indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Contact indexes
      CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(first_name, last_name);

      -- Email indexes
      CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);

      -- Calendar indexes
      CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_time ON calendar_items(start_time, end_time);

      -- OAuth indexes
      CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_tokens(provider);
    `);
  }

  private encrypt(data: any): EncryptedData {
    const iv = randomBytes(16).toString('hex');
    const content = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      this.encryptionKey,
      {
        iv: CryptoJS.enc.Hex.parse(iv),
      }
    ).toString();

    return { iv, content };
  }

  private decrypt(encrypted: EncryptedData): any {
    try {
      const bytes = CryptoJS.AES.decrypt(
        encrypted.content,
        this.encryptionKey,
        {
          iv: CryptoJS.enc.Hex.parse(encrypted.iv),
        }
      );
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      throw new PersonalContextError('Failed to decrypt data', 'DECRYPT_ERROR');
    }
  }

  // User operations
  async addUser(input: AddUserInput): Promise<User> {
    await this.initialized;
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const encryptedPreferences = this.encrypt(input.preferences || {});

    try {
      const stmt = this.db.prepare(
        `INSERT INTO users (id, email, name, encrypted_preferences, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      
      stmt.run([
        id,
        input.email,
        input.name,
        JSON.stringify(encryptedPreferences),
        now,
        now
      ]);
      stmt.free();
      
      // Save changes to file
      this.saveDatabase();

      return {
        id,
        email: input.email,
        name: input.name,
        preferences: input.preferences || {},
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      throw new PersonalContextError('Failed to add user', 'DB_ERROR');
    }
  }

  // Contact operations
  async addContact(input: AddContactInput): Promise<Contact> {
    await this.initialized;
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const encryptedData = this.encrypt({
      emails: input.emails || [],
      phoneNumbers: input.phoneNumbers || [],
      addresses: input.addresses || [],
      relationships: input.relationships || [],
      metadata: input.metadata || {},
    });

    try {
      const stmt = this.db.prepare(
        `INSERT INTO contacts (id, user_id, first_name, last_name, encrypted_data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      
      stmt.run([
        id,
        input.userId,
        input.firstName,
        input.lastName,
        JSON.stringify(encryptedData),
        now,
        now
      ]);
      stmt.free();
      
      // Save changes to file
      this.saveDatabase();

      return {
        id,
        firstName: input.firstName,
        lastName: input.lastName,
        emails: input.emails || [],
        phoneNumbers: input.phoneNumbers || [],
        addresses: input.addresses || [],
        relationships: input.relationships || [],
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      throw new PersonalContextError('Failed to add contact', 'DB_ERROR');
    }
  }

  // Email operations
  async addEmail(input: AddEmailInput): Promise<Email> {
    await this.initialized;
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const encryptedBody = this.encrypt(input.body);
    const encryptedAttachments = this.encrypt(input.attachments || []);

    try {
      const stmt = this.db.prepare(
        `INSERT INTO emails (
          id, user_id, subject, encrypted_body, sender, recipients,
          thread_id, labels, encrypted_attachments, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      stmt.run([
        id,
        input.userId,
        input.subject,
        JSON.stringify(encryptedBody),
        input.sender,
        JSON.stringify(input.recipients),
        input.threadId || null,
        JSON.stringify(input.labels || []),
        JSON.stringify(encryptedAttachments),
        now,
        now
      ]);
      stmt.free();
      
      // Save changes to file
      this.saveDatabase();

      return {
        id,
        subject: input.subject,
        body: input.body,
        sender: input.sender,
        recipients: input.recipients,
        timestamp: now,
        threadId: input.threadId,
        labels: input.labels || [],
        attachments: input.attachments || [],
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      throw new PersonalContextError('Failed to add email', 'DB_ERROR');
    }
  }

  // Calendar item operations
  async addCalendarItem(input: AddCalendarItemInput): Promise<CalendarItem> {
    await this.initialized;
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const encryptedDescription = this.encrypt(input.description);
    const encryptedMetadata = this.encrypt(input.metadata || {});

    try {
      const stmt = this.db.prepare(
        `INSERT INTO calendar_items (
          id, user_id, title, encrypted_description, start_time, end_time,
          location, attendees, recurrence, encrypted_metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      stmt.run([
        id,
        input.userId,
        input.title,
        JSON.stringify(encryptedDescription),
        input.startTime,
        input.endTime,
        input.location || null,
        JSON.stringify(input.attendees),
        input.recurrence || null,
        JSON.stringify(encryptedMetadata),
        now,
        now
      ]);
      stmt.free();
      
      // Save changes to file
      this.saveDatabase();

      return {
        id,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        location: input.location,
        attendees: input.attendees,
        recurrence: input.recurrence,
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      throw new PersonalContextError('Failed to add calendar item', 'DB_ERROR');
    }
  }

  // OAuth token operations
  async addOAuthToken(input: AddOAuthTokenInput): Promise<OAuthToken> {
    await this.initialized;
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const encryptedTokens = this.encrypt({
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      metadata: input.metadata || {},
    });

    try {
      const stmt = this.db.prepare(
        `INSERT INTO oauth_tokens (
          id, user_id, provider, encrypted_tokens, scopes,
          expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      stmt.run([
        id,
        input.userId,
        input.provider,
        JSON.stringify(encryptedTokens),
        JSON.stringify(input.scopes),
        input.expiresAt,
        now,
        now
      ]);
      stmt.free();
      
      // Save changes to file
      this.saveDatabase();

      return {
        id,
        userId: input.userId,
        provider: input.provider,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      throw new PersonalContextError('Failed to add OAuth token', 'DB_ERROR');
    }
  }

  // Generic update operation
  async updateEntity(type: string, input: UpdateEntityInput): Promise<any> {
    await this.initialized;
    const now = new Date().toISOString();

    switch (type) {
      case 'user': {
        const encryptedPreferences = this.encrypt(input.data.preferences || {});
        const stmt = this.db.prepare(
          `UPDATE users
           SET name = COALESCE(?, name),
               encrypted_preferences = COALESCE(?, encrypted_preferences),
               updated_at = ?
           WHERE id = ?`
        );
        
        stmt.run([
          input.data.name,
          JSON.stringify(encryptedPreferences),
          now,
          input.id
        ]);
        stmt.free();
        
        // Save changes to file
        this.saveDatabase();
        break;
      }

      case 'contact': {
        const encryptedContactData = this.encrypt(input.data);
        const stmt = this.db.prepare(
          `UPDATE contacts
           SET first_name = COALESCE(?, first_name),
               last_name = COALESCE(?, last_name),
               encrypted_data = ?,
               updated_at = ?
           WHERE id = ?`
        );
        
        stmt.run([
          input.data.firstName,
          input.data.lastName,
          JSON.stringify(encryptedContactData),
          now,
          input.id
        ]);
        stmt.free();
        
        // Save changes to file
        this.saveDatabase();
        break;
      }

      // Add cases for other entity types...

      default:
        throw new PersonalContextError(`Unknown entity type: ${type}`, 'INVALID_TYPE');
    }

    return this.getEntity(type, { id: input.id });
  }

  // Generic get operation
  async getEntity(type: string, query: GetEntityInput): Promise<any[]> {
    await this.initialized;
    let sql: string;
    const params: any[] = [];

    switch (type) {
      case 'user':
        sql = 'SELECT * FROM users WHERE 1=1';
        if (query.id) {
          sql += ' AND id = ?';
          params.push(query.id);
        }
        if (query.query) {
          sql += ' AND (email LIKE ? OR name LIKE ?)';
          params.push(`%${query.query}%`, `%${query.query}%`);
        }
        break;

      case 'contact':
        sql = 'SELECT * FROM contacts WHERE 1=1';
        if (query.id) {
          sql += ' AND id = ?';
          params.push(query.id);
        }
        if (query.userId) {
          sql += ' AND user_id = ?';
          params.push(query.userId);
        }
        if (query.query) {
          sql += ' AND (first_name LIKE ? OR last_name LIKE ?)';
          params.push(`%${query.query}%`, `%${query.query}%`);
        }
        break;

      // Add cases for other entity types...

      default:
        throw new PersonalContextError(`Unknown entity type: ${type}`, 'INVALID_TYPE');
    }

    const stmt = this.db.prepare(sql);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows.map((row: any) => this.mapRowToEntity(type, row));
  }

  private mapRowToEntity(type: string, row: any): any {
    switch (type) {
      case 'user':
        const preferences = this.decrypt(JSON.parse(row.encrypted_preferences));
        return {
          id: row.id,
          email: row.email,
          name: row.name,
          preferences,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

      case 'contact':
        const contactData = this.decrypt(JSON.parse(row.encrypted_data));
        return {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          ...contactData,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

      // Add cases for other entity types...

      default:
        throw new PersonalContextError(`Unknown entity type: ${type}`, 'INVALID_TYPE');
    }
  }

  async close() {
    await this.initialized;
    // Save any pending changes
    this.saveDatabase();
    this.db.close();
  }
}
