#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'path';
import { mkdir } from 'fs/promises';
import { SQLiteDB } from './sqliteDB.js';
import { AuthManager } from './auth.js';
import {
  AddUserInput,
  AddContactInput,
  AddEmailInput,
  AddCalendarItemInput,
  AddOAuthTokenInput,
  UpdateEntityInput,
  GetEntityInput,
  PersonalContextError,
  AuthorizationError
} from './types.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import config from './config.js';

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
await mkdir(dbDir, { recursive: true });

const db = new SQLiteDB();
const auth = new AuthManager();

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

// Validate authorization for tool calls
function validateAuth(token: string, requiredScope: string) {
  try {
    const authToken = auth.verifyToken(token);
    if (!auth.validateScope(authToken, requiredScope)) {
      throw new AuthorizationError(`Missing required scope: ${requiredScope}`, 'INSUFFICIENT_SCOPE');
    }
    return authToken;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    throw new AuthorizationError('Invalid authorization', 'INVALID_AUTH');
  }
}

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add-user',
      description: 'Add a new user',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
          preferences: { type: 'object' },
          authorization: { type: 'string' },
        },
        required: ['email', 'name', 'authorization'],
      },
    },
    {
      name: 'add-contact',
      description: 'Add a new contact',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          emails: { type: 'array', items: { type: 'string' } },
          phoneNumbers: { type: 'array', items: { type: 'string' } },
          addresses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                postalCode: { type: 'string' },
              },
            },
          },
          relationships: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
          authorization: { type: 'string' },
        },
        required: ['userId', 'firstName', 'lastName', 'authorization'],
      },
    },
    {
      name: 'add-email',
      description: 'Add a new email',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          sender: { type: 'string' },
          recipients: { type: 'array', items: { type: 'string' } },
          threadId: { type: 'string' },
          labels: { type: 'array', items: { type: 'string' } },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                mimeType: { type: 'string' },
                size: { type: 'number' },
                url: { type: 'string' },
              },
            },
          },
          authorization: { type: 'string' },
        },
        required: ['userId', 'subject', 'body', 'sender', 'recipients', 'authorization'],
      },
    },
    {
      name: 'add-calendar-item',
      description: 'Add a new calendar item',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          location: { type: 'string' },
          attendees: { type: 'array', items: { type: 'string' } },
          recurrence: { type: 'string' },
          metadata: { type: 'object' },
          authorization: { type: 'string' },
        },
        required: ['userId', 'title', 'description', 'startTime', 'endTime', 'attendees', 'authorization'],
      },
    },
    {
      name: 'add-oauth-token',
      description: 'Add a new OAuth token',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          provider: { type: 'string' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
          expiresAt: { type: 'string' },
          metadata: { type: 'object' },
          authorization: { type: 'string' },
        },
        required: ['userId', 'provider', 'accessToken', 'refreshToken', 'scopes', 'expiresAt', 'authorization'],
      },
    },
    {
      name: 'update-entity',
      description: 'Update an existing entity',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['user', 'contact', 'email', 'calendar-item', 'oauth-token'] },
          id: { type: 'string' },
          data: { type: 'object' },
          authorization: { type: 'string' },
        },
        required: ['type', 'id', 'data', 'authorization'],
      },
    },
    {
      name: 'get-entity',
      description: 'Get entity by ID or query',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['user', 'contact', 'email', 'calendar-item', 'oauth-token'] },
          id: { type: 'string' },
          userId: { type: 'string' },
          query: { type: 'string' },
          filters: { type: 'object' },
          authorization: { type: 'string' },
        },
        required: ['type', 'authorization'],
      },
    },
  ],
}));

// Input types with authorization
interface AuthorizedInput extends Record<string, unknown> {
  authorization: string;
}

interface AuthorizedUserInput extends AddUserInput, AuthorizedInput {}
interface AuthorizedContactInput extends AddContactInput, AuthorizedInput {}
interface AuthorizedEmailInput extends AddEmailInput, AuthorizedInput {}
interface AuthorizedCalendarItemInput extends AddCalendarItemInput, AuthorizedInput {}
interface AuthorizedOAuthTokenInput extends AddOAuthTokenInput, AuthorizedInput {}
interface AuthorizedUpdateEntityInput extends UpdateEntityInput, AuthorizedInput {
  type: string;
}
interface AuthorizedGetEntityInput extends GetEntityInput, AuthorizedInput {
  type: string;
}

// Type guard functions
function isAddUserInput(args: Record<string, unknown>): args is AuthorizedUserInput {
  return (
    typeof args.email === 'string' &&
    typeof args.name === 'string' &&
    (args.preferences === undefined || typeof args.preferences === 'object') &&
    typeof args.authorization === 'string'
  );
}

function isAddContactInput(args: Record<string, unknown>): args is AuthorizedContactInput {
  return (
    typeof args.userId === 'string' &&
    typeof args.firstName === 'string' &&
    typeof args.lastName === 'string' &&
    (args.emails === undefined || Array.isArray(args.emails)) &&
    (args.phoneNumbers === undefined || Array.isArray(args.phoneNumbers)) &&
    (args.addresses === undefined || Array.isArray(args.addresses)) &&
    (args.relationships === undefined || Array.isArray(args.relationships)) &&
    (args.metadata === undefined || typeof args.metadata === 'object') &&
    typeof args.authorization === 'string'
  );
}

function isAddEmailInput(args: Record<string, unknown>): args is AuthorizedEmailInput {
  return (
    typeof args.userId === 'string' &&
    typeof args.subject === 'string' &&
    typeof args.body === 'string' &&
    typeof args.sender === 'string' &&
    Array.isArray(args.recipients) &&
    (args.threadId === undefined || typeof args.threadId === 'string') &&
    (args.labels === undefined || Array.isArray(args.labels)) &&
    (args.attachments === undefined || Array.isArray(args.attachments)) &&
    typeof args.authorization === 'string'
  );
}

function isAddCalendarItemInput(args: Record<string, unknown>): args is AuthorizedCalendarItemInput {
  return (
    typeof args.userId === 'string' &&
    typeof args.title === 'string' &&
    typeof args.description === 'string' &&
    typeof args.startTime === 'string' &&
    typeof args.endTime === 'string' &&
    (args.location === undefined || typeof args.location === 'string') &&
    Array.isArray(args.attendees) &&
    (args.recurrence === undefined || typeof args.recurrence === 'string') &&
    (args.metadata === undefined || typeof args.metadata === 'object') &&
    typeof args.authorization === 'string'
  );
}

function isAddOAuthTokenInput(args: Record<string, unknown>): args is AuthorizedOAuthTokenInput {
  return (
    typeof args.userId === 'string' &&
    typeof args.provider === 'string' &&
    typeof args.accessToken === 'string' &&
    typeof args.refreshToken === 'string' &&
    Array.isArray(args.scopes) &&
    typeof args.expiresAt === 'string' &&
    (args.metadata === undefined || typeof args.metadata === 'object') &&
    typeof args.authorization === 'string'
  );
}

function isUpdateEntityInput(args: Record<string, unknown>): args is AuthorizedUpdateEntityInput {
  return (
    typeof args.type === 'string' &&
    typeof args.id === 'string' &&
    typeof args.data === 'object' &&
    args.data !== null &&
    typeof args.authorization === 'string'
  );
}

function isGetEntityInput(args: Record<string, unknown>): args is AuthorizedGetEntityInput {
  return (
    typeof args.type === 'string' &&
    (args.id === undefined || typeof args.id === 'string') &&
    (args.userId === undefined || typeof args.userId === 'string') &&
    (args.query === undefined || typeof args.query === 'string') &&
    (args.filters === undefined || typeof args.filters === 'object') &&
    typeof args.authorization === 'string'
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

  try {
    switch (name) {
      case 'add-user': {
        if (!isAddUserInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for add-user' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, 'write:users');
        const user = await db.addUser(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added user ${user.name} (ID: ${user.id})`,
            },
          ],
        };
      }

      case 'add-contact': {
        if (!isAddContactInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for add-contact' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, 'write:contacts');
        const contact = await db.addContact(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added contact ${contact.firstName} ${contact.lastName} (ID: ${contact.id})`,
            },
          ],
        };
      }

      case 'add-email': {
        if (!isAddEmailInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for add-email' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, 'write:emails');
        const email = await db.addEmail(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added email "${email.subject}" (ID: ${email.id})`,
            },
          ],
        };
      }

      case 'add-calendar-item': {
        if (!isAddCalendarItemInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for add-calendar-item' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, 'write:calendar');
        const calendarItem = await db.addCalendarItem(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added calendar item "${calendarItem.title}" (ID: ${calendarItem.id})`,
            },
          ],
        };
      }

      case 'add-oauth-token': {
        if (!isAddOAuthTokenInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for add-oauth-token' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, 'write:oauth');
        const token = await db.addOAuthToken(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added OAuth token for ${token.provider} (ID: ${token.id})`,
            },
          ],
        };
      }

      case 'update-entity': {
        if (!isUpdateEntityInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for update-entity' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, `write:${args.type}s`);
        const entity = await db.updateEntity(args.type, args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated ${args.type} (ID: ${args.id})`,
            },
          ],
        };
      }

      case 'get-entity': {
        if (!isGetEntityInput(args)) {
          return {
            content: [{ type: 'text', text: 'Invalid input for get-entity' }],
            isError: true,
          };
        }

        validateAuth(args.authorization, `read:${args.type}s`);
        const entities = await db.getEntity(args.type, args);
        
        if (entities.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No matching entities found',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(entities, null, 2),
            },
          ],
        };
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
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        content: [
          {
            type: 'text',
            text: `Authorization error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    if (error instanceof PersonalContextError) {
      return {
        content: [
          {
            type: 'text',
            text: `Operation failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle cleanup on exit
process.on('SIGINT', async () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
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
