import * as chrono from 'chrono-node';
import type { Priority, ParsedTaskInput } from '../../shared/types';

/**
 * Parse natural language task input into structured data
 *
 * Examples:
 * - "Buy milk tomorrow 3pm" → title: "Buy milk", dueDate: tomorrow, dueTime: 15:00
 * - "Call mom !high #family" → title: "Call mom", priority: high, tags: ["family"]
 * - "Meeting ^work every monday" → title: "Meeting", listName: "work"
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  let text = input.trim();

  const result: ParsedTaskInput = {
    title: '',
    dueDate: null,
    dueTime: null,
    priority: null,
    tags: [],
    listName: null,
  };

  // Extract priority (!high, !med, !low, !!!, !!, !)
  const priorityPatterns: { pattern: RegExp; priority: Priority }[] = [
    { pattern: /\s*!{3}(?!\w)/g, priority: 'high' },
    { pattern: /\s*!{2}(?!\w)/g, priority: 'medium' },
    { pattern: /\s*!(?!\w)(?!!)/g, priority: 'low' },
    { pattern: /\s*!high\b/gi, priority: 'high' },
    { pattern: /\s*!med(?:ium)?\b/gi, priority: 'medium' },
    { pattern: /\s*!low\b/gi, priority: 'low' },
  ];

  for (const { pattern, priority } of priorityPatterns) {
    if (pattern.test(text)) {
      result.priority = priority;
      text = text.replace(pattern, ' ');
      break;
    }
  }

  // Extract tags (#tagname)
  const tagPattern = /#(\w+)/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(text)) !== null) {
    result.tags.push(tagMatch[1]);
  }
  text = text.replace(tagPattern, ' ');

  // Extract list (^listname)
  const listPattern = /\^(\w+)/g;
  const listMatch = listPattern.exec(text);
  if (listMatch) {
    result.listName = listMatch[1];
    text = text.replace(listPattern, ' ');
  }

  // Parse date/time using chrono
  const parsedDate = chrono.parse(text, new Date(), { forwardDate: true });

  if (parsedDate.length > 0) {
    const parsed = parsedDate[0];
    const date = parsed.start.date();

    // Format date as YYYY-MM-DD
    result.dueDate = date.toISOString().split('T')[0];

    // Check if time was explicitly mentioned
    if (parsed.start.isCertain('hour')) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      result.dueTime = `${hours}:${minutes}`;
    }

    // Remove the date text from input
    text = text.slice(0, parsed.index) + text.slice(parsed.index + parsed.text.length);
  }

  // Clean up title - remove extra whitespace
  result.title = text.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Get the default due date based on the current smart list context
 */
export function getDefaultDueDateForSmartList(smartListId: string): string | null {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (smartListId) {
    case 'today':
      return today.toISOString().split('T')[0];
    case 'tomorrow':
      return tomorrow.toISOString().split('T')[0];
    case 'inbox':
    case 'all':
    case 'completed':
    default:
      return null;
  }
}

/**
 * Get placeholder text for quick-add based on context
 */
export function getQuickAddPlaceholder(selectedListId: string, listName?: string): string {
  switch (selectedListId) {
    case 'today':
      return 'Add task for today...';
    case 'tomorrow':
      return 'Add task for tomorrow...';
    case 'week':
      return 'Add task for this week...';
    case 'inbox':
      return 'Add task to inbox...';
    case 'all':
      return 'Add task...';
    case 'completed':
      return ''; // Should hide quick-add
    default:
      // Custom list
      return listName ? `Add task to ${listName}...` : 'Add task...';
  }
}

/**
 * Determine which Eisenhower quadrant a task belongs to
 *
 * Urgent = due today, tomorrow, or overdue
 * Important = priority high or medium
 */
export function getEisenhowerQuadrant(
  dueDate: string | null,
  priority: Priority
): 'do-first' | 'schedule' | 'delegate' | 'eliminate' {
  const isUrgent = checkIsUrgent(dueDate);
  const isImportant = priority === 'high' || priority === 'medium';

  if (isUrgent && isImportant) return 'do-first';
  if (!isUrgent && isImportant) return 'schedule';
  if (isUrgent && !isImportant) return 'delegate';
  return 'eliminate';
}

/**
 * Check if a task is urgent based on due date
 * Urgent = due today, tomorrow, or overdue
 */
export function checkIsUrgent(dueDate: string | null): boolean {
  if (!dueDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);

  // Urgent if overdue, due today, or due tomorrow
  return taskDate < dayAfterTomorrow;
}

/**
 * Format parsed input as preview chips
 */
export function formatParsedChips(parsed: ParsedTaskInput): { type: string; label: string }[] {
  const chips: { type: string; label: string }[] = [];

  if (parsed.dueDate) {
    const date = new Date(parsed.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateLabel: string;
    const taskDate = new Date(parsed.dueDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === today.getTime()) {
      dateLabel = 'Today';
    } else if (taskDate.getTime() === tomorrow.getTime()) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    if (parsed.dueTime) {
      dateLabel += ` ${parsed.dueTime}`;
    }

    chips.push({ type: 'date', label: dateLabel });
  }

  if (parsed.priority) {
    chips.push({ type: 'priority', label: parsed.priority });
  }

  for (const tag of parsed.tags) {
    chips.push({ type: 'tag', label: `#${tag}` });
  }

  if (parsed.listName) {
    chips.push({ type: 'list', label: `^${parsed.listName}` });
  }

  return chips;
}
