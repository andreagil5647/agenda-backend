import type { ObjectId } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import type { SessionsRepository } from '../repositories/sessions.repository.js';
import {
  toUserView,
  type UsersRepository,
  type UserView,
} from '../repositories/users.repository.js';
import type { PatchSettingsRequest } from '../schemas/planner.schemas.js';

export interface PlannerRepositories {
  users: UsersRepository;
  sessions: SessionsRepository;
}

export class PlannerService {
  constructor(private readonly repositories: PlannerRepositories) {}

  getMe(userId: ObjectId): Promise<UserView> {
    return this.requireUser(userId);
  }

  async updateSettings(userId: ObjectId, input: PatchSettingsRequest): Promise<UserView> {
    const user = await this.repositories.users.updateSettings(userId, input);
    return toUserView(user);
  }

  async deleteAccount(userId: ObjectId): Promise<void> {
    await this.repositories.sessions.deleteManyByUser(userId);
    await this.repositories.users.softDelete(userId);
  }

  private async requireUser(userId: ObjectId): Promise<UserView> {
    const user = await this.repositories.users.findActiveById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toUserView(user);
  }
}
