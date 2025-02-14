// Error types
export class PersonalContextError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'PersonalContextError';
    }
}
