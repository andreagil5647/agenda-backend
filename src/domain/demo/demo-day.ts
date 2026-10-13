/**
 * The planner a demo account starts with, described in wall-clock terms: day
 * offsets from "today" and minutes from midnight. The demo service turns it
 * into documents in the visitor's time zone, so the day looks the same
 * wherever and whenever the demo is opened. The words come from the
 * dictionary of the visitor's language; the shape of the day does not change.
 */
import type { Locale } from '../locale.js';
import { DEMO_TEXTS, type DemoTextKey } from './demo-text.js';

export type DemoCalendarKey = 'work' | 'personal' | 'health';

export interface DemoCalendar {
  key: DemoCalendarKey;
  name: string;
  colorKey: string;
  defaultReminderMinutes: number[];
}

export interface DemoTask {
  key: string;
  title: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  status: 'todo' | 'done';
  estimateMinutes: number;
  /** Days from today, or null for a task with no due date. */
  dueInDays: number | null;
}

export interface DemoBlock {
  calendar: DemoCalendarKey;
  title: string;
  dayOffset: number;
  startMinutes: number;
  endMinutes: number;
  /** Key of the task this block is time set aside for. */
  task?: string;
}

export interface DemoAllDayEvent {
  calendar: DemoCalendarKey;
  title: string;
  dayOffset: number;
  days: number;
}

export interface DemoDay {
  displayName: string;
  calendars: DemoCalendar[];
  tasks: DemoTask[];
  blocks: DemoBlock[];
  allDayEvents: DemoAllDayEvent[];
}

/** A part of the day with its words left out, naming the entry in the dictionary instead. */
type Worded<Part, Field extends keyof Part> = Omit<Part, Field> & { text: DemoTextKey };

const at = (hours: number, minutes = 0): number => hours * 60 + minutes;

const CALENDARS: readonly Worded<DemoCalendar, 'name'>[] = [
  { key: 'work', text: 'calendar.work', colorKey: 'blue', defaultReminderMinutes: [10] },
  { key: 'personal', text: 'calendar.personal', colorKey: 'green', defaultReminderMinutes: [] },
  { key: 'health', text: 'calendar.health', colorKey: 'rose', defaultReminderMinutes: [30] },
];

const TASKS: readonly Worded<DemoTask, 'title'>[] = [
  {
    key: 'checklist',
    text: 'task.checklist',
    priority: 'high',
    status: 'todo',
    estimateMinutes: 90,
    dueInDays: 0,
  },
  {
    key: 'release-notes',
    text: 'task.releaseNotes',
    priority: 'high',
    status: 'todo',
    estimateMinutes: 45,
    dueInDays: 0,
  },
  {
    key: 'venue',
    text: 'task.venue',
    priority: 'medium',
    status: 'todo',
    estimateMinutes: 15,
    dueInDays: 0,
  },
  {
    key: 'sprint',
    text: 'task.sprint',
    priority: 'medium',
    status: 'todo',
    estimateMinutes: 60,
    dueInDays: 1,
  },
  {
    key: 'dentist',
    text: 'task.dentist',
    priority: 'low',
    status: 'todo',
    estimateMinutes: 15,
    dueInDays: null,
  },
  {
    key: 'invoice',
    text: 'task.invoice',
    priority: 'medium',
    status: 'done',
    estimateMinutes: 15,
    dueInDays: 0,
  },
];

const BLOCKS: readonly Worded<DemoBlock, 'title'>[] = [
  {
    calendar: 'work',
    text: 'block.standUp',
    dayOffset: 0,
    startMinutes: at(9),
    endMinutes: at(9, 30),
  },
  {
    calendar: 'work',
    text: 'task.checklist',
    dayOffset: 0,
    startMinutes: at(9, 30),
    endMinutes: at(11),
    task: 'checklist',
  },
  {
    calendar: 'work',
    text: 'block.designReview',
    dayOffset: 0,
    startMinutes: at(11, 30),
    endMinutes: at(12, 15),
  },
  {
    calendar: 'personal',
    text: 'block.lunch',
    dayOffset: 0,
    startMinutes: at(13),
    endMinutes: at(14),
  },
  // These two overlap on purpose, so the grid shows blocks side by side.
  {
    calendar: 'work',
    text: 'block.customerCall',
    dayOffset: 0,
    startMinutes: at(15),
    endMinutes: at(16),
  },
  {
    calendar: 'work',
    text: 'block.pullRequests',
    dayOffset: 0,
    startMinutes: at(15, 30),
    endMinutes: at(16, 30),
  },
  {
    calendar: 'health',
    text: 'block.gym',
    dayOffset: 0,
    startMinutes: at(18, 30),
    endMinutes: at(19, 30),
  },
  {
    calendar: 'work',
    text: 'block.oneToOne',
    dayOffset: 1,
    startMinutes: at(10),
    endMinutes: at(10, 45),
  },
];

const ALL_DAY_EVENTS: readonly Worded<DemoAllDayEvent, 'title'>[] = [
  { calendar: 'work', text: 'allDay.releaseWeek', dayOffset: 0, days: 3 },
];

/** The demo day written in the language of `locale`. */
export function demoDayFor(locale: Locale): DemoDay {
  const texts = DEMO_TEXTS[locale];

  return {
    displayName: texts['user.displayName'],
    calendars: CALENDARS.map(({ text, ...calendar }) => ({ ...calendar, name: texts[text] })),
    tasks: TASKS.map(({ text, ...task }) => ({ ...task, title: texts[text] })),
    blocks: BLOCKS.map(({ text, ...block }) => ({ ...block, title: texts[text] })),
    allDayEvents: ALL_DAY_EVENTS.map(({ text, ...event }) => ({ ...event, title: texts[text] })),
  };
}
