import { describe, expect, it } from 'vitest';
import { LOCALES } from '../locale.js';
import { demoDayFor, type DemoDay } from './demo-day.js';
import { DEMO_TEXTS } from './demo-text.js';

const MINUTES_PER_DAY = 24 * 60;
const GRID_STEP_MINUTES = 15;

/** Words that are the same in every language: a name, or a word the two share. */
const SAME_IN_EVERY_LANGUAGE = new Set(['calendar.personal']);

function everyWordOf(day: DemoDay): string[] {
  return [
    day.displayName,
    ...day.calendars.map(({ name }) => name),
    ...[...day.tasks, ...day.blocks, ...day.allDayEvents].map(({ title }) => title),
  ];
}

describe.each(LOCALES)('demo day in %s', (locale) => {
  const day = demoDayFor(locale);
  const calendarKeys = day.calendars.map((calendar) => calendar.key);
  const taskKeys = day.tasks.map((task) => task.key);

  it('only refers to calendars and tasks that are defined', () => {
    for (const block of day.blocks) {
      expect(calendarKeys).toContain(block.calendar);
      if (block.task) expect(taskKeys).toContain(block.task);
    }
    for (const event of day.allDayEvents) {
      expect(calendarKeys).toContain(event.calendar);
    }
  });

  it('keeps every block inside one day, ending after it starts', () => {
    for (const block of day.blocks) {
      expect(block.startMinutes).toBeGreaterThanOrEqual(0);
      expect(block.endMinutes).toBeGreaterThan(block.startMinutes);
      expect(block.endMinutes).toBeLessThanOrEqual(MINUTES_PER_DAY);
    }
  });

  it('starts and ends every block on the grid step', () => {
    for (const block of day.blocks) {
      expect(block.startMinutes % GRID_STEP_MINUTES).toBe(0);
      expect(block.endMinutes % GRID_STEP_MINUTES).toBe(0);
    }
  });

  it('uses unique task keys and valid estimates', () => {
    expect(new Set(taskKeys).size).toBe(taskKeys.length);
    for (const task of day.tasks) {
      expect(task.estimateMinutes).toBeGreaterThanOrEqual(5);
    }
  });

  it('leaves tasks unscheduled, so there is something to drag onto the grid', () => {
    const scheduled = new Set(day.blocks.map((block) => block.task));
    const unscheduled = day.tasks.filter(
      (task) => task.status === 'todo' && !scheduled.has(task.key),
    );

    expect(unscheduled.length).toBeGreaterThanOrEqual(3);
  });

  it('uses every word of its dictionary, and no empty one', () => {
    const used = new Set(everyWordOf(day));

    for (const word of Object.values(DEMO_TEXTS[locale])) {
      expect(word.trim()).not.toBe('');
      expect(used).toContain(word);
    }
  });
});

describe('demo day across languages', () => {
  it('has the same shape in every language, only the words change', () => {
    const wordless = (day: DemoDay): unknown => ({
      calendars: day.calendars.map((calendar) => ({ ...calendar, name: '' })),
      tasks: day.tasks.map((task) => ({ ...task, title: '' })),
      blocks: day.blocks.map((block) => ({ ...block, title: '' })),
      allDayEvents: day.allDayEvents.map((event) => ({ ...event, title: '' })),
    });

    for (const locale of LOCALES) {
      expect(wordless(demoDayFor(locale))).toEqual(wordless(demoDayFor('en')));
    }
  });

  it('writes the words of Spanish in Spanish, not in English', () => {
    const english = new Map(Object.entries(DEMO_TEXTS.en));

    for (const [key, word] of Object.entries(DEMO_TEXTS.es)) {
      if (!SAME_IN_EVERY_LANGUAGE.has(key)) {
        expect(word, key).not.toBe(english.get(key));
      }
    }
  });
});
