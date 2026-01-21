// Task priority levels
export type Priority = 'none' | 'low' | 'medium' | 'high';

// Smart list identifiers
export type SmartListId = 'inbox' | 'today' | 'tomorrow' | 'week' | 'all' | 'completed';

// Recurrence patterns
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

// Regenerate mode for recurring tasks
export type RegenerateMode = 'on_completion' | 'fixed_schedule';

// Weekday numbers (0 = Sunday, 6 = Saturday)
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Recurrence configuration
export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number; // Every N days/weeks/months/years
  weekdays: Weekday[]; // For weekly custom patterns
  endDate: string | null; // Optional end date
  regenerateMode: RegenerateMode;
}

// Task interface
export interface Task {
  id: string;
  listId: string | null;
  title: string;
  description: string;
  notes: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  completed: boolean;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  // Recurrence fields
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceWeekdays: Weekday[];
  recurrenceEndDate: string | null;
  regenerateMode: RegenerateMode;
}

// Subtask interface
export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// List interface
export interface List {
  id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// Tag interface
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Task with subtasks and tags
export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
  tags: Tag[];
}

// Create/Update DTOs
export interface CreateTaskDTO {
  listId?: string | null;
  title: string;
  description?: string;
  notes?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Priority;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number;
  recurrenceWeekdays?: Weekday[];
  recurrenceEndDate?: string | null;
  regenerateMode?: RegenerateMode;
}

export interface UpdateTaskDTO {
  listId?: string | null;
  title?: string;
  description?: string;
  notes?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Priority;
  completed?: boolean;
  position?: number;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number;
  recurrenceWeekdays?: Weekday[];
  recurrenceEndDate?: string | null;
  regenerateMode?: RegenerateMode;
}

export interface CreateSubtaskDTO {
  taskId: string;
  title: string;
}

export interface UpdateSubtaskDTO {
  title?: string;
  completed?: boolean;
  position?: number;
}

export interface CreateListDTO {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateListDTO {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface CreateTagDTO {
  name: string;
  color?: string;
}

export interface UpdateTagDTO {
  name?: string;
  color?: string;
}

// Search/Filter options
export interface TaskFilter {
  searchQuery?: string;
  tagIds?: string[];
  priorities?: Priority[];
  dateRange?: {
    start: string;
    end: string;
  };
  completed?: boolean;
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Tasks
  TASK_CREATE: 'task:create',
  TASK_GET_ALL: 'task:getAll',
  TASK_GET_BY_ID: 'task:getById',
  TASK_GET_BY_LIST: 'task:getByList',
  TASK_GET_SMART: 'task:getSmart',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_REORDER: 'task:reorder',
  TASK_COMPLETE_RECURRING: 'task:completeRecurring',

  // Subtasks
  SUBTASK_CREATE: 'subtask:create',
  SUBTASK_UPDATE: 'subtask:update',
  SUBTASK_DELETE: 'subtask:delete',
  SUBTASK_REORDER: 'subtask:reorder',

  // Lists
  LIST_CREATE: 'list:create',
  LIST_GET_ALL: 'list:getAll',
  LIST_GET_BY_ID: 'list:getById',
  LIST_UPDATE: 'list:update',
  LIST_DELETE: 'list:delete',
  LIST_REORDER: 'list:reorder',

  // Tags
  TAG_CREATE: 'tag:create',
  TAG_GET_ALL: 'tag:getAll',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',
  TAG_ADD_TO_TASK: 'tag:addToTask',
  TAG_REMOVE_FROM_TASK: 'tag:removeFromTask',

  // Search
  TASK_SEARCH: 'task:search',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Theme
  THEME_GET: 'theme:get',
  THEME_SET: 'theme:set',
  THEME_GET_SYSTEM: 'theme:getSystem',
} as const;

// Application settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultListId: string | null;
  showCompletedTasks: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultListId: null,
  showCompletedTasks: true,
  startMinimized: false,
  minimizeToTray: true,
};

// Smart list definitions
export const SMART_LISTS: { id: SmartListId; name: string; icon: string }[] = [
  { id: 'inbox', name: 'Inbox', icon: '📥' },
  { id: 'today', name: 'Today', icon: '📅' },
  { id: 'tomorrow', name: 'Tomorrow', icon: '🌅' },
  { id: 'week', name: 'Next 7 Days', icon: '📆' },
  { id: 'all', name: 'All Tasks', icon: '📋' },
  { id: 'completed', name: 'Completed', icon: '✅' },
];
