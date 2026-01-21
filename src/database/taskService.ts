import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type {
  Task,
  Subtask,
  TaskWithSubtasks,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreateSubtaskDTO,
  UpdateSubtaskDTO,
  SmartListId,
} from '../shared/types';

// Helper to convert DB row to Task object
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

function rowToSubtask(row: any): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    completed: Boolean(row.completed),
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Task Service
export const taskService = {
  create(data: CreateTaskDTO): Task {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get the max position for tasks in the same list
    const maxPosStmt = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM tasks WHERE list_id IS ?'
    );
    const maxPosResult = maxPosStmt.get(data.listId ?? null) as { maxPos: number };
    const position = maxPosResult.maxPos + 1;

    const stmt = db.prepare(`
      INSERT INTO tasks (id, list_id, title, description, notes, due_date, due_time, priority, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.listId ?? null,
      data.title,
      data.description ?? '',
      data.notes ?? '',
      data.dueDate ?? null,
      data.dueTime ?? null,
      data.priority ?? 'none',
      position,
      now,
      now
    );

    return this.getById(id)!;
  },

  getById(id: string): Task | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id);
    return row ? rowToTask(row) : null;
  },

  getByIdWithSubtasks(id: string): TaskWithSubtasks | null {
    const task = this.getById(id);
    if (!task) return null;

    const subtasks = subtaskService.getByTaskId(id);
    return { ...task, subtasks };
  },

  getAll(): Task[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tasks ORDER BY position ASC');
    const rows = stmt.all();
    return rows.map(rowToTask);
  },

  getByListId(listId: string | null): Task[] {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM tasks WHERE list_id IS ? ORDER BY position ASC'
    );
    const rows = stmt.all(listId);
    return rows.map(rowToTask);
  },

  getSmartList(smartListId: SmartListId): Task[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let stmt;
    switch (smartListId) {
      case 'inbox':
        stmt = db.prepare(
          'SELECT * FROM tasks WHERE list_id IS NULL AND completed = 0 ORDER BY position ASC'
        );
        break;
      case 'today':
        stmt = db.prepare(
          'SELECT * FROM tasks WHERE due_date = ? AND completed = 0 ORDER BY position ASC'
        );
        return stmt.all(today).map(rowToTask);
      case 'tomorrow':
        stmt = db.prepare(
          'SELECT * FROM tasks WHERE due_date = ? AND completed = 0 ORDER BY position ASC'
        );
        return stmt.all(tomorrow).map(rowToTask);
      case 'week':
        stmt = db.prepare(
          'SELECT * FROM tasks WHERE due_date >= ? AND due_date <= ? AND completed = 0 ORDER BY due_date ASC, position ASC'
        );
        return stmt.all(today, weekFromNow).map(rowToTask);
      case 'all':
        stmt = db.prepare(
          'SELECT * FROM tasks WHERE completed = 0 ORDER BY position ASC'
        );
        break;
      case 'completed':
        stmt = db.prepare(
          'SELECT * FROM tasks WHERE completed = 1 ORDER BY completed_at DESC'
        );
        break;
      default:
        return [];
    }

    return stmt.all().map(rowToTask);
  },

  update(id: string, data: UpdateTaskDTO): Task | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.listId !== undefined) {
      updates.push('list_id = ?');
      values.push(data.listId);
    }
    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }
    if (data.dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(data.dueDate);
    }
    if (data.dueTime !== undefined) {
      updates.push('due_time = ?');
      values.push(data.dueTime);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.completed !== undefined) {
      updates.push('completed = ?');
      values.push(data.completed ? 1 : 0);
      if (data.completed) {
        updates.push('completed_at = ?');
        values.push(now);
      } else {
        updates.push('completed_at = ?');
        values.push(null);
      }
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  reorder(taskIds: string[]): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      taskIds.forEach((id, index) => {
        stmt.run(index, now, id);
      });
    });

    transaction();
  },
};

// Subtask Service
export const subtaskService = {
  create(data: CreateSubtaskDTO): Subtask {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get the max position for subtasks of this task
    const maxPosStmt = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM subtasks WHERE task_id = ?'
    );
    const maxPosResult = maxPosStmt.get(data.taskId) as { maxPos: number };
    const position = maxPosResult.maxPos + 1;

    const stmt = db.prepare(`
      INSERT INTO subtasks (id, task_id, title, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.taskId, data.title, position, now, now);

    return this.getById(id)!;
  },

  getById(id: string): Subtask | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM subtasks WHERE id = ?');
    const row = stmt.get(id);
    return row ? rowToSubtask(row) : null;
  },

  getByTaskId(taskId: string): Subtask[] {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC'
    );
    const rows = stmt.all(taskId);
    return rows.map(rowToSubtask);
  },

  update(id: string, data: UpdateSubtaskDTO): Subtask | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.completed !== undefined) {
      updates.push('completed = ?');
      values.push(data.completed ? 1 : 0);
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  reorder(subtaskIds: string[]): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE subtasks SET position = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      subtaskIds.forEach((id, index) => {
        stmt.run(index, now, id);
      });
    });

    transaction();
  },
};
