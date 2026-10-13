import type { ObjectId } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import { toUserView, type UserView } from '../mappers/user.mapper.js';
import type { CalendarsRepository } from '../repositories/calendars.repository.js';
import type { EventsRepository } from '../repositories/events.repository.js';
import type { SessionsRepository } from '../repositories/sessions.repository.js';
import type { TasksRepository } from '../repositories/tasks.repository.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import type { PatchSettingsRequest } from '../schemas/me.schemas.js';

export interface MeRepositories {
  users: UsersRepository;
  sessions: SessionsRepository;
  calendars: CalendarsRepository;
  tasks: TasksRepository;
  events: EventsRepository;
}

export class MeService {
  constructor(private readonly repositories: MeRepositories) {}

  async getMe(userId: ObjectId): Promise<UserView> {
    const user = await this.repositories.users.findActiveById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toUserView(user);
  }

  async updateSettings(userId: ObjectId, input: PatchSettingsRequest): Promise<UserView> {
    const user = await this.repositories.users.updateSettings(userId, input);
    return toUserView(user);
  }

  async deleteAccount(userId: ObjectId): Promise<void> {
    await Promise.all([
      this.repositories.sessions.deleteManyByUser(userId),
      this.repositories.calendars.deleteManyByUser(userId),
      this.repositories.tasks.deleteManyByUser(userId),
      this.repositories.events.deleteManyByUser(userId),
    ]);
    await this.repositories.users.softDelete(userId);
  }
}
