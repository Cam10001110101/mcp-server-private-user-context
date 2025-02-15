# Technical Implementation Details

## Database Schema

### personal_info Table
```sql
CREATE TABLE personal_info (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT,
  encrypted_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_personal_info_type ON personal_info(type);
CREATE INDEX idx_personal_info_name ON personal_info(name);
```

### Indexes
- `idx_personal_info_type`: Optimizes queries filtering by information type
- `idx_personal_info_name`: Optimizes queries searching by name

## Encryption System

### AES-256-CBC Implementation

The server uses the Advanced Encryption Standard (AES) in Cipher Block Chaining (CBC) mode with a 256-bit key:

1. **Initialization Vector (IV)**
   ```typescript
   const iv = randomBytes(16).toString('hex');
   ```
   - 16 bytes (128 bits) random IV generated for each encryption
   - Ensures identical data encrypts to different ciphertexts
   - Prevents pattern analysis attacks

2. **Encryption Process**
   ```typescript
   const content = CryptoJS.AES.encrypt(
     JSON.stringify(data),
     encryptionKey,
     {
       iv: CryptoJS.enc.Hex.parse(iv)
     }
   ).toString();
   ```
   - Data is JSON stringified before encryption
   - Uses CryptoJS for AES implementation
   - Returns Base64 encoded ciphertext

3. **Decryption Process**
   ```typescript
   const bytes = CryptoJS.AES.decrypt(
     encrypted.content,
     encryptionKey,
     {
       iv: CryptoJS.enc.Hex.parse(encrypted.iv)
     }
   );
   return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
   ```
   - Decrypts using stored IV and encryption key
   - Converts decrypted bytes to UTF-8 string
   - Parses JSON to restore original data structure

### Data Storage Format

Encrypted data is stored in the following format:
```typescript
interface EncryptedData {
  iv: string;      // Hex-encoded 16-byte IV
  content: string; // Base64-encoded encrypted data
}
```

This structure is then JSON stringified before being stored in the `encrypted_data` column.

## Type System

### Core Data Types

1. **PersonalInfo Interface**
   ```typescript
   interface PersonalInfo {
     id: string;
     type: 'contact' | 'preference' | 'context';
     name: string;
     relationship?: string;
     data: Record<string, any>;
     createdAt: string;
     updatedAt: string;
   }
   ```
   - Represents the public-facing data structure
   - `data` field can contain any JSON-serializable content
   - Timestamps in ISO 8601 format

2. **Database Schema Type**
   ```typescript
   interface DBSchema {
     personal_info: {
       id: string;
       type: string;
       name: string;
       relationship: string | null;
       encrypted_data: string;
       created_at: string;
       updated_at: string;
     };
   }
   ```
   - Mirrors the SQLite table structure
   - Used for type-safe database operations

### Tool Input Types

1. **AddPersonalInfoInput**
   ```typescript
   interface AddPersonalInfoInput {
     type: 'contact' | 'preference' | 'context';
     name: string;
     relationship?: string;
     data: Record<string, any>;
   }
   ```

2. **UpdatePersonalInfoInput**
   ```typescript
   interface UpdatePersonalInfoInput {
     id: string;
     data: Record<string, any>;
   }
   ```

3. **GetPersonalInfoInput**
   ```typescript
   interface GetPersonalInfoInput {
     id?: string;
     type?: string;
     name?: string;
     relationship?: string;
   }
   ```

## Error Handling

Custom error class with error codes:
```typescript
class PersonalContextError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PersonalContextError';
  }
}
```

Common error codes:
- `DECRYPT_ERROR`: Failed to decrypt data
- `DB_ERROR`: Database operation failed
- `NOT_FOUND`: Requested information not found

## Performance Considerations

1. **Database Indexing**
   - Indexes on frequently queried columns
   - Optimized for search operations

2. **Memory Management**
   - Encryption/decryption performed in memory
   - Large objects handled in chunks when possible

3. **Connection Handling**
   - Single database connection per server instance
   - Proper cleanup on server shutdown

4. **Query Optimization**
   - Prepared statements for repeated queries
   - Efficient WHERE clause construction
