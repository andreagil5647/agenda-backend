/**
 * The planner a demo account starts with, described in wall-clock terms: day
 * offsets from "today" and minutes from midnight. The demo service turns it
 * into documents in the visitor's time zone, so the day looks the same
 * wherever and whenever the demo is opened.
 */

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

const at = (hours: number, minutes = 0): number => hours * 60 + minutes;

export const DEMO_CALENDARS: readonly DemoCalendar[] = [
  { key: 'work', name: 'Work', colorKey: 'blue', defaultReminderMinutes: [10] },
  { key: 'personal', name: 'Personal', colorKey: 'green', defaultReminderMinutes: [] },
  { key: 'health', name: 'Health', colorKey: 'rose', defaultReminderMinutes: [30] },
];

export const DEMO_TASKS: readonly DemoTask[] = [
  {
    key: 'checklist',
    title: 'Draft launch checklist',
    priority: 'high',
    status: 'todo',
    estimateMinutes: 90,
    dueInDays: 0,
  },
  {
    key: 'release-notes',
    title: 'Write release notes',
    priority: 'high',
    status: 'todo',
    estimateMinutes: 45,
    dueInDays: 0,
  },
  {
    key: 'venue',
    title: 'Reply to Sam about the venue',
    priority: 'medium',
    status: 'todo',
    estimateMinutes: 15,
    dueInDays: 0,
  },
  {
    key: 'sprint',
    title: 'Plan next sprint',
    priority: 'medium',
    status: 'todo',
    estimateMinutes: 60,
    dueInDays: 1,
  },
  {
    key: 'dentist',
    title: 'Book dentist appointment',
    priority: 'low',
    status: 'todo',
    estimateMinutes: 15,
    dueInDays: null,
  },
  {
    key: 'invoice',
    title: 'Send invoice',
    priority: 'medium',
    status: 'done',
    estimateMinutes: 15,
    dueInDays: 0,
  },
];

export const DEMO_BLOCKS: readonly DemoBlock[] = [
  { calendar: 'work', title: 'Stand-up', dayOffset: 0, startMinutes: at(9), endMinutes: at(9, 30) },
  {
    calendar: 'work',
    title: 'Draft launch checklist',
    dayOffset: 0,
    startMinutes: at(9, 30),
    endMinutes: at(11),
    task: 'checklist',
  },
  {
    calendar: 'work',
    title: 'Design review',
    dayOffset: 0,
    startMinutes: at(11, 30),
    endMinutes: at(12, 15),
  },
  {
    calendar: 'personal',
    title: 'Lunch with Marta',
    dayOffset: 0,
    startMinutes: at(13),
    endMinutes: at(14),
  },
  // These two overlap on purpose, so the grid shows blocks side by side.
  {
    calendar: 'work',
    title: 'Customer call',
    dayOffset: 0,
    startMinutes: at(15),
    endMinutes: at(16),
  },
  {
    calendar: 'work',
    title: 'Review pull requests',
    dayOffset: 0,
    startMinutes: at(15, 30),
    endMinutes: at(16, 30),
  },
  {
    calendar: 'health',
    title: 'Gym',
    dayOffset: 0,
    startMinutes: at(18, 30),
    endMinutes: at(19, 30),
  },
  {
    calendar: 'work',
    title: '1:1 with Alex',
    dayOffset: 1,
    startMinutes: at(10),
    endMinutes: at(10, 45),
  },
];

export const DEMO_ALL_DAY_EVENTS: readonly DemoAllDayEvent[] = [
  { calendar: 'work', title: 'Release week', dayOffset: 0, days: 3 },
];
