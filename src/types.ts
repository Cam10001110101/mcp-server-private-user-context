// Types for personal context data
export interface PersonalInfo {
  id: string;
  type: 'contact' | 'preference' | 'context';
  name: string;
  relationship?: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Types for encrypted data
export interface EncryptedData {
  iv: string;
  content: string;
}

// Database schema types
export interface DBSchema {
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

// Tool input types with index signatures
export interface AddPersonalInfoInput extends Record<string, unknown> {
  type: 'contact' | 'preference' | 'context';
  name: string;
  relationship?: string;
  data: Record<string, any>;
}

export interface UpdatePersonalInfoInput extends Record<string, unknown> {
  id: string;
  data: Record<string, any>;
}

export interface GetPersonalInfoInput extends Record<string, unknown> {
  id?: string;
  type?: string;
  name?: string;
  relationship?: string;
}

// Error types
export class PersonalContextError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PersonalContextError';
  }
}
