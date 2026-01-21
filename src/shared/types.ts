// Task priority levels
export type Priority = 'none' | 'low' | 'medium' | 'high';

// Smart list identifiers
export type SmartListId = 'inbox' | 'today' | 'tomorrow' | 'week' | 'all' | 'completed';

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

// Task with subtasks
export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
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
