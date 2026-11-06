// Augments express-session to include application-specific session fields
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
    permissions: string[];
    mustChangePassword: boolean;
    csrfToken: string;
  }
}
