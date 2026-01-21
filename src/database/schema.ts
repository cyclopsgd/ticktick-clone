// Database schema creation SQL
export const CREATE_TABLES_SQL = `
-- Lists table
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '📁',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  list_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  due_date TEXT,
  due_time TEXT,
  priority TEXT DEFAULT 'none' CHECK(priority IN ('none', 'low', 'medium', 'high')),
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Recurrence fields
  recurrence_pattern TEXT DEFAULT 'none' CHECK(recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_weekdays TEXT DEFAULT '[]',
  recurrence_end_date TEXT,
  regenerate_mode TEXT DEFAULT 'on_completion' CHECK(regenerate_mode IN ('on_completion', 'fixed_schedule')),
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL
);

-- Subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Task-Tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
`;

// Migration system for future schema updates
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: CREATE_TABLES_SQL,
  },
  {
    version: 2,
    name: 'add_recurrence_fields',
    sql: `
-- Add recurrence fields to tasks table
ALTER TABLE tasks ADD COLUMN recurrence_pattern TEXT DEFAULT 'none' CHECK(recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'));
ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN recurrence_weekdays TEXT DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN recurrence_end_date TEXT;
ALTER TABLE tasks ADD COLUMN regenerate_mode TEXT DEFAULT 'on_completion' CHECK(regenerate_mode IN ('on_completion', 'fixed_schedule'));
`,
  },
];
