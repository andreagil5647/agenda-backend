import { objectIdToString } from '../repositories/base.repository.js';
import type { UserDocument, UserSettings } from '../repositories/users.repository.js';

export interface UserView {
  id: string;
  email: string;
  displayName: string;
  settings: UserSettings;
  isDemo: boolean;
}

export function toUserView(user: UserDocument): UserView {
  return {
    id: objectIdToString(user._id),
    email: user.email,
    displayName: user.displayName,
    settings: user.settings,
    isDemo: user.isDemo,
  };
}
