import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { taskService } from './taskService';
import type { Task, Weekday, RecurrencePattern, RegenerateMode } from '../shared/types';

/**
 * Calculate the next due date based on recurrence pattern
 */
function calculateNextDueDate(
  currentDueDate: string | null,
  pattern: RecurrencePattern,
  interval: number,
  weekdays: Weekday[],
  regenerateMode: RegenerateMode
): string | null {
  if (pattern === 'none' || !currentDueDate) {
    return null;
  }

  // Use current due date for fixed schedule, or today for on_completion
  const baseDate = regenerateMode === 'fixed_schedule'
    ? new Date(currentDueDate)
    : new Date();

  // Reset time to start of day
  baseDate.setHours(0, 0, 0, 0);

  let nextDate: Date;

  switch (pattern) {
    case 'daily':
      nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case 'weekly':
      if (weekdays.length > 0) {
        // Find the next weekday in the list
        nextDate = findNextWeekday(baseDate, weekdays, interval);
      } else {
        // Simple weekly recurrence
        nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + 7 * interval);
      }
      break;

    case 'monthly':
      nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;

    case 'yearly':
      nextDate = new Date(baseDate);
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;

    case 'custom':
      // For custom, use interval as days
      nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    default:
      return null;
  }

  return nextDate.toISOString().split('T')[0];
}

/**
 * Find the next weekday from the list of allowed weekdays
 */
function findNextWeekday(baseDate: Date, weekdays: Weekday[], weeksInterval: number): Date {
  const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
  const currentWeekday = baseDate.getDay() as Weekday;

  // Find the next weekday after the current day in the same week
  const nextInWeek = sortedWeekdays.find(wd => wd > currentWeekday);

  if (nextInWeek !== undefined && weeksInterval === 1) {
    // Found a day later in the current week
    const result = new Date(baseDate);
    result.setDate(result.getDate() + (nextInWeek - currentWeekday));
    return result;
  }

  // Go to the first weekday of the next applicable week
  const firstWeekday = sortedWeekdays[0];
  const result = new Date(baseDate);

  // Calculate days to add to get to the first weekday of the next week(s)
  const daysToFirstWeekday = (7 - currentWeekday + firstWeekday) % 7 || 7;
  result.setDate(result.getDate() + daysToFirstWeekday + (weeksInterval - 1) * 7);

  return result;
}

/**
 * Create the next instance of a recurring task
 */
export function createNextRecurringTask(completedTask: Task): Task | null {
  if (completedTask.recurrencePattern === 'none') {
    return null;
  }

  // Calculate the next due date
  const nextDueDate = calculateNextDueDate(
    completedTask.dueDate,
    completedTask.recurrencePattern,
    completedTask.recurrenceInterval,
    completedTask.recurrenceWeekdays,
    completedTask.regenerateMode
  );

  // Check if we've passed the end date
  if (completedTask.recurrenceEndDate && nextDueDate) {
    if (new Date(nextDueDate) > new Date(completedTask.recurrenceEndDate)) {
      return null;
    }
  }

  // Create the new task with the same properties but new due date
  const newTask = taskService.create({
    listId: completedTask.listId,
    title: completedTask.title,
    description: completedTask.description,
    notes: completedTask.notes,
    dueDate: nextDueDate,
    dueTime: completedTask.dueTime,
    priority: completedTask.priority,
    recurrencePattern: completedTask.recurrencePattern,
    recurrenceInterval: completedTask.recurrenceInterval,
    recurrenceWeekdays: completedTask.recurrenceWeekdays,
    recurrenceEndDate: completedTask.recurrenceEndDate,
    regenerateMode: completedTask.regenerateMode,
  });

  // Copy tags from the original task
  const db = getDatabase();
  const copyTagsStmt = db.prepare(`
    INSERT INTO task_tags (task_id, tag_id, created_at)
    SELECT ?, tag_id, datetime('now')
    FROM task_tags
    WHERE task_id = ?
  `);
  copyTagsStmt.run(newTask.id, completedTask.id);

  return newTask;
}

/**
 * Complete a task and handle recurrence
 * Returns the newly created task if it's recurring, null otherwise
 */
export function completeRecurringTask(taskId: string): { completedTask: Task; nextTask: Task | null } | null {
  const task = taskService.getById(taskId);
  if (!task) {
    return null;
  }

  // Mark the current task as completed
  const completedTask = taskService.update(taskId, { completed: true });
  if (!completedTask) {
    return null;
  }

  // If it's a recurring task, create the next instance
  const nextTask = task.recurrencePattern !== 'none'
    ? createNextRecurringTask(completedTask)
    : null;

  return { completedTask, nextTask };
}

export const recurrenceService = {
  calculateNextDueDate,
  createNextRecurringTask,
  completeRecurringTask,
};
