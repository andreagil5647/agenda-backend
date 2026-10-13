import type { UserView } from './user.mapper.js';

export interface SessionView {
  user: UserView;
  expiresAt: string;
  csrfToken: string;
}

export function toSessionView(
  session: { user: UserView; expiresAt: Date },
  csrfToken: string,
): SessionView {
  return {
    user: session.user,
    expiresAt: session.expiresAt.toISOString(),
    csrfToken,
  };
}
