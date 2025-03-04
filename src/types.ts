// Error types
export class PersonalContextError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'PersonalContextError';
  }
}

export class AuthorizationError extends PersonalContextError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'AuthorizationError';
  }
}

// Database schema
export interface DBSchema {
  users: User[];
  contacts: Contact[];
  emails: Email[];
  calendarItems: CalendarItem[];
  oauthTokens: OAuthToken[];
}

// Entity interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  preferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  emails?: string[];
  phoneNumbers?: string[];
  addresses?: Address[];
  relationships?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Email {
  id: string;
  subject: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: string;
  threadId?: string;
  labels?: string[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  recurrence?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthToken {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  expiresAt: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Helper interfaces
export interface Address {
  type: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface EncryptedData {
  iv: string;
  content: string;
}

// Input interfaces
export interface AddUserInput {
  email: string;
  name: string;
  preferences?: Record<string, any>;
}

export interface AddContactInput {
  userId: string;
  firstName: string;
  lastName: string;
  emails?: string[];
  phoneNumbers?: string[];
  addresses?: Address[];
  relationships?: string[];
  metadata?: Record<string, any>;
}

export interface AddEmailInput {
  userId: string;
  subject: string;
  body: string;
  sender: string;
  recipients: string[];
  threadId?: string;
  labels?: string[];
  attachments?: Attachment[];
}

export interface AddCalendarItemInput {
  userId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  recurrence?: string;
  metadata?: Record<string, any>;
}

export interface AddOAuthTokenInput {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface UpdateEntityInput {
  id: string;
  data: Record<string, any>;
}

export interface GetEntityInput {
  id?: string;
  userId?: string;
  query?: string;
  filters?: Record<string, any>;
}
