import type { Db } from 'mongodb';
import type { Logger } from 'pino';
import type { Liveness, Readiness } from '../schemas/health.schemas.js';

const DATABASE_PING_TIMEOUT_MS = 2_000;

export class HealthService {
  constructor(
    private readonly db: Db,
    private readonly logger: Logger,
    private readonly version: string,
  ) {}

  getLiveness(): Liveness {
    return {
      status: 'ok',
      version: this.version,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async getReadiness(): Promise<Readiness> {
    const database = await this.pingDatabase();
    return {
      status: database === 'up' ? 'ok' : 'unavailable',
      checks: { database },
    };
  }

  private async pingDatabase(): Promise<'up' | 'down'> {
    try {
      await this.db.command({ ping: 1 }, { timeoutMS: DATABASE_PING_TIMEOUT_MS });
      return 'up';
    } catch (error) {
      this.logger.warn({ err: error }, 'Database ping failed');
      return 'down';
    }
  }
}
