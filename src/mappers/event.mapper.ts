import { objectIdToString } from '../repositories/base.repository.js';
import type { EventDocument } from '../repositories/events.repository.js';

export interface EventView {
  id: string;
  calendarId: string;
  title: string;
  notes: string | null;
  taskId: string | null;
  kind: 'timed' | 'allDay';
  startUtc: string | null;
  endUtc: string | null;
  timeZone: string | null;
  startDate: string | null;
  endDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function toEventView(event: EventDocument): EventView {
  return {
    id: objectIdToString(event._id),
    calendarId: objectIdToString(event.calendarId),
    title: event.title,
    notes: event.notes,
    taskId: event.taskId ? objectIdToString(event.taskId) : null,
    kind: event.kind,
    startUtc: event.startUtc?.toISOString() ?? null,
    endUtc: event.endUtc?.toISOString() ?? null,
    timeZone: event.timeZone,
    startDate: event.startDate,
    endDate: event.endDate,
    version: event.version,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
