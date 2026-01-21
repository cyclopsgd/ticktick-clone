import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { Tag, CreateTagDTO, UpdateTagDTO, TaskFilter, Task } from '../shared/types';

// Helper to convert DB row to Tag object
function rowToTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Tag Service
export const tagService = {
  create(data: CreateTagDTO): Tag {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO tags (id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.color ?? '#6366f1', now, now);

    return this.getById(id)!;
  },

  getById(id: string): Tag | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    const row = stmt.get(id);
    return row ? rowToTag(row) : null;
  },

  getByName(name: string): Tag | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tags WHERE name = ?');
    const row = stmt.get(name);
    return row ? rowToTag(row) : null;
  },

  getAll(): Tag[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC');
    const rows = stmt.all();
    return rows.map(rowToTag);
  },

  update(id: string, data: UpdateTagDTO): Tag | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Get tags for a specific task
  getTagsForTask(taskId: string): Tag[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN task_tags tt ON t.id = tt.tag_id
      WHERE tt.task_id = ?
      ORDER BY t.name ASC
    `);
    const rows = stmt.all(taskId);
    return rows.map(rowToTag);
  },

  // Add a tag to a task
  addTagToTask(taskId: string, tagId: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO task_tags (task_id, tag_id, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(taskId, tagId, new Date().toISOString());
  },

  // Remove a tag from a task
  removeTagFromTask(taskId: string, tagId: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?');
    stmt.run(taskId, tagId);
  },

  // Get or create tag by name
  getOrCreate(name: string, color?: string): Tag {
    const existing = this.getByName(name);
    if (existing) return existing;
    return this.create({ name, color });
  },
};

// Helper to convert DB row to Task object (duplicated for search)
function rowToTask(row: any): Task {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description,
    notes: row.notes,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    completed: Boolean(row.completed),
    completedAt: row.completed_at,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Search Service
export const searchService = {
  searchTasks(filter: TaskFilter): Task[] {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    // Text search
    if (filter.searchQuery) {
      conditions.push('(t.title LIKE ? OR t.description LIKE ? OR t.notes LIKE ?)');
      const searchTerm = `%${filter.searchQuery}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Tag filter
    if (filter.tagIds && filter.tagIds.length > 0) {
      const placeholders = filter.tagIds.map(() => '?').join(',');
      conditions.push(`t.id IN (
        SELECT DISTINCT task_id FROM task_tags WHERE tag_id IN (${placeholders})
      )`);
      params.push(...filter.tagIds);
    }

    // Priority filter
    if (filter.priorities && filter.priorities.length > 0) {
      const placeholders = filter.priorities.map(() => '?').join(',');
      conditions.push(`t.priority IN (${placeholders})`);
      params.push(...filter.priorities);
    }

    // Date range filter
    if (filter.dateRange) {
      conditions.push('t.due_date >= ? AND t.due_date <= ?');
      params.push(filter.dateRange.start, filter.dateRange.end);
    }

    // Completed filter
    if (filter.completed !== undefined) {
      conditions.push('t.completed = ?');
      params.push(filter.completed ? 1 : 0);
    }

    let sql = 'SELECT t.* FROM tasks t';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY t.position ASC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(rowToTask);
  },
};
