#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomBytes } from 'crypto';
import path from 'path';
import { mkdir } from 'fs/promises';
import { PersonalContextDB } from './db.js';
import { AddPersonalInfoInput, UpdatePersonalInfoInput, GetPersonalInfoInput, PersonalContextError } from './types.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Initialize database with a random encryption key
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

if (!process.env.DB_PATH) {
  throw new Error('DB_PATH environment variable is required');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const DB_PATH = process.env.DB_PATH;

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
await mkdir(dbDir, { recursive: true });

const db = new PersonalContextDB(DB_PATH, ENCRYPTION_KEY);

// Create MCP server instance
const server = new Server(
  {
    name: 'personal-context',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add-personal-info',
      description: 'Add new personal information or context',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['contact', 'preference', 'context'] },
          name: { type: 'string' },
          relationship: { type: 'string' },
          data: { type: 'object' },
        },
        required: ['type', 'name', 'data'],
      },
    },
    {
      name: 'update-personal-info',
      description: 'Update existing personal information',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          data: { type: 'object' },
        },
        required: ['id', 'data'],
      },
    },
    {
      name: 'get-personal-info',
      description: 'Retrieve personal information by ID, name, or relationship',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
          relationship: { type: 'string' },
        },
      },
    },
    {
      name: 'search-personal-info',
      description: 'Search personal information by name or relationship',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  ],
}));

// Type guard functions
function isAddPersonalInfoInput(args: Record<string, unknown>): args is AddPersonalInfoInput {
  return (
    typeof args.type === 'string' &&
    ['contact', 'preference', 'context'].includes(args.type) &&
    typeof args.name === 'string' &&
    (args.relationship === undefined || typeof args.relationship === 'string') &&
    typeof args.data === 'object' &&
    args.data !== null
  );
}

function isUpdatePersonalInfoInput(args: Record<string, unknown>): args is UpdatePersonalInfoInput {
  return (
    typeof args.id === 'string' &&
    typeof args.data === 'object' &&
    args.data !== null
  );
}

function isGetPersonalInfoInput(args: Record<string, unknown>): args is GetPersonalInfoInput {
  return (
    (args.id === undefined || typeof args.id === 'string') &&
    (args.type === undefined || typeof args.type === 'string') &&
    (args.name === undefined || typeof args.name === 'string') &&
    (args.relationship === undefined || typeof args.relationship === 'string')
  );
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args || typeof args !== 'object') {
    return {
      content: [{ type: 'text', text: 'Invalid arguments provided' }],
      isError: true,
    };
  }

  switch (name) {
    case 'add-personal-info': {
      try {
        if (!isAddPersonalInfoInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for add-personal-info' }],
            isError: true,
          };
        }

        const info = await db.addPersonalInfo(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added personal information for ${info.name} (ID: ${info.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to add personal information: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'update-personal-info': {
      try {
        if (!isUpdatePersonalInfoInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for update-personal-info' }],
            isError: true,
          };
        }

        const info = await db.updatePersonalInfo(args.id, args.data);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated information for ${info.name}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update personal information: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'get-personal-info': {
      try {
        if (!isGetPersonalInfoInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for get-personal-info' }],
            isError: true,
          };
        }

        const info = db.getPersonalInfo(args);
        if (!info) {
          return {
            content: [
              {
                type: 'text',
                text: 'No matching personal information found',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve personal information: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'search-personal-info': {
      try {
        const query = args.query;
        if (typeof query !== 'string') {
          return {
            content: [{ type: 'text', text: 'Invalid input for search-personal-info' }],
            isError: true,
          };
        }

        const results = db.searchPersonalInfo(query);
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No matching results found',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search personal information: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// Handle cleanup on exit
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Personal Context MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  db.close();
  process.exit(1);
});
