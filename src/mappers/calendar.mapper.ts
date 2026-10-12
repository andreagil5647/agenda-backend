import { objectIdToString } from '../repositories/base.repository.js';
import type { CalendarDocument } from '../repositories/calendars.repository.js';

export interface CalendarView {
  id: string;
  name: string;
  colorKey: string;
  visible: boolean;
  defaultReminderMinutes: number[];
  order: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function toCalendarView(calendar: CalendarDocument): CalendarView {
  return {
    id: objectIdToString(calendar._id),
    name: calendar.name,
    colorKey: calendar.colorKey,
    visible: calendar.visible,
    defaultReminderMinutes: calendar.defaultReminderMinutes,
    order: calendar.order,
    version: calendar.version,
    createdAt: calendar.createdAt.toISOString(),
    updatedAt: calendar.updatedAt.toISOString(),
  };
}
