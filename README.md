# Personal Context MCP Server

A secure MCP server for managing personal information and context with encryption.

## Setup Requirements

1. Node.js and npm installed
2. Directory permissions for database creation
3. Environment variables (required):
   - `ENCRYPTION_KEY`: Encryption key (32-byte hex string)
   - `DB_PATH`: SQLite database path

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## MCP Configuration

Add to your MCP settings (e.g. Cline's settings):

```json
{
  "mcpServers": {
    "personal-context": {
      "command": "node",
      "args": ["path/to/build/server.js"],
      "env": {
        "ENCRYPTION_KEY": "your-32-byte-hex-key",
        "DB_PATH": "path/to/database.db"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Available Tools

1. `add-personal-info`: Add new personal information (contacts, preferences, context)
2. `update-personal-info`: Update existing information
3. `get-personal-info`: Retrieve information by ID/name/type
4. `search-personal-info`: Search across stored information

## Security

- All data is encrypted using AES-256-CBC
- Each record uses a unique initialization vector
- Database contains only encrypted data
- Encryption key should be kept secure
