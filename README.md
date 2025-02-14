# Personal Context MCP Server

An MCP server that securely stores and manages personal context and PII (Personally Identifiable Information). This server provides tools for storing, updating, and retrieving personal information while maintaining data privacy through encryption.

## Features

- Secure storage of personal information with AES encryption
- Support for different types of personal context (contacts, preferences, general context)
- Tools for adding, updating, and searching personal information
- SQLite database for lightweight, portable storage
- Configurable through environment variables

## Encryption Implementation

The server uses a robust encryption system to protect all personal data:

### AES Encryption
- Uses AES (Advanced Encryption Standard) in CBC mode with a 256-bit key
- Each piece of data is encrypted with a unique Initialization Vector (IV)
- The IV is randomly generated for each encryption operation to prevent pattern analysis
- The encryption key is never stored in the database

### Data Storage Process
1. When storing personal information:
   - A random 16-byte IV is generated using Node's crypto.randomBytes
   - The data is converted to JSON and encrypted using AES-256-CBC
   - Both the IV and encrypted content are stored in the database
   - The format is: `{ iv: "<hex-encoded-iv>", content: "<encrypted-data>" }`

2. When retrieving information:
   - The system retrieves the IV and encrypted content
   - Uses the encryption key to decrypt the data
   - Verifies data integrity during decryption

### Security Measures
- The encryption key is provided via environment variable or generated randomly at startup
- All encryption operations are performed in memory
- Failed decryption attempts are logged and handled securely
- The database only stores encrypted data, never plaintext

## Example Usage

Here are natural ways to interact with the server through Claude. Each example shows how to trigger specific tools:

### Adding Personal Information

The `add-personal-info` tool will be triggered by phrases like:
```
Remember that my mom's name is Sarah Johnson and her phone number is 555-0123
Remember that my sister Emily lives in Seattle and her email is emily@example.com
Save my doctor's contact info: Dr. Smith at 555-9876, office on 123 Medical Drive
```

### Storing Preferences

The `add-personal-info` tool with type "preference" will be triggered by:
```
Remember that I prefer dark mode in my applications
Remember that my favorite color is blue and I like minimalist design
Save that I'm a vegetarian and allergic to nuts
```

### Adding Context

The `add-personal-info` tool with type "context" will be triggered by:
```
Remember that I'm working on a book about AI ethics
Note that I'm planning to move to Boston next year
Save that I'm learning Spanish and practicing daily
```

### Retrieving Information

The `get-personal-info` tool will be triggered by:
```
What's my mom's contact information?
What are my saved food preferences?
Tell me what you know about my sister
```

### Searching Information

The `search-personal-info` tool will be triggered by:
```
Find all information related to my family members
Search for any medical-related information you have stored
Look up all my saved preferences about technology
```

### Updating Information

The `update-personal-info` tool will be triggered by:
```
Update my mom's phone number to 555-4567
Change my sister's email address to newemail@example.com
Update my food preferences to include that I'm now vegan
```

## Security Features

- All sensitive data is encrypted using AES encryption
- The encryption key should be kept secure and not committed to version control
- The database file contains encrypted data but should still be protected
- The server validates all inputs before processing

## Configuration

The server can be configured using environment variables:

- `ENCRYPTION_KEY`: Custom encryption key for data (generated randomly if not provided)
- `DB_PATH`: Custom path for the SQLite database (defaults to `personal_context.db` in current directory)

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start the server
npm start
```

## License

ISC
