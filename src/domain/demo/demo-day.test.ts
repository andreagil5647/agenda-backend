import { describe, expect, it } from 'vitest';
import { DEMO_ALL_DAY_EVENTS, DEMO_BLOCKS, DEMO_CALENDARS, DEMO_TASKS } from './demo-day.js';

const MINUTES_PER_DAY = 24 * 60;
const GRID_STEP_MINUTES = 15;

describe('demo day', () => {
  const calendarKeys = DEMO_CALENDARS.map((calendar) => calendar.key);
  const taskKeys = DEMO_TASKS.map((task) => task.key);

  it('only refers to calendars and tasks that are defined', () => {
    for (const block of DEMO_BLOCKS) {
      expect(calendarKeys).toContain(block.calendar);
      if (block.task) expect(taskKeys).toContain(block.task);
    }
    for (const event of DEMO_ALL_DAY_EVENTS) {
      expect(calendarKeys).toContain(event.calendar);
    }
  });

  it('keeps every block inside one day, ending after it starts', () => {
    for (const block of DEMO_BLOCKS) {
      expect(block.startMinutes).toBeGreaterThanOrEqual(0);
      expect(block.endMinutes).toBeGreaterThan(block.startMinutes);
      expect(block.endMinutes).toBeLessThanOrEqual(MINUTES_PER_DAY);
    }
  });

  it('starts and ends every block on the grid step', () => {
    for (const block of DEMO_BLOCKS) {
      expect(block.startMinutes % GRID_STEP_MINUTES).toBe(0);
      expect(block.endMinutes % GRID_STEP_MINUTES).toBe(0);
    }
  });

  it('uses unique task keys and valid estimates', () => {
    expect(new Set(taskKeys).size).toBe(taskKeys.length);
    for (const task of DEMO_TASKS) {
      expect(task.estimateMinutes).toBeGreaterThanOrEqual(5);
    }
  });

  it('leaves tasks unscheduled, so there is something to drag onto the grid', () => {
    const scheduled = new Set(DEMO_BLOCKS.map((block) => block.task));
    const unscheduled = DEMO_TASKS.filter(
      (task) => task.status === 'todo' && !scheduled.has(task.key),
    );

    expect(unscheduled.length).toBeGreaterThanOrEqual(3);
  });
});
