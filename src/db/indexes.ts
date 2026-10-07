import type { Db } from 'mongodb';

export async function ensureDatabaseIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, name: 'users_email_unique' },
      {
        key: { expiresAt: 1 },
        expireAfterSeconds: 0,
        name: 'users_expires_at_ttl',
        partialFilterExpression: { expiresAt: { $type: 'date' } },
      },
    ]),
    db.collection('sessions').createIndexes([
      { key: { tokenHash: 1 }, unique: true, name: 'sessions_token_hash_unique' },
      { key: { userId: 1 }, name: 'sessions_user_id' },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'sessions_expires_at_ttl' },
    ]),
    db.collection('calendars').createIndexes([
      { key: { userId: 1, order: 1 }, name: 'calendars_user_order' },
      { key: { userId: 1, deletedAt: 1 }, name: 'calendars_user_deleted' },
    ]),
    db.collection('tasks').createIndexes([
      { key: { userId: 1, status: 1, order: 1 }, name: 'tasks_user_status_order' },
      { key: { userId: 1, dueDate: 1 }, name: 'tasks_user_due_date' },
      { key: { userId: 1, deletedAt: 1 }, name: 'tasks_user_deleted' },
    ]),
  ]);
}
