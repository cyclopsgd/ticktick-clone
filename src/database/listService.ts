import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { List, CreateListDTO, UpdateListDTO } from '../shared/types';

// Helper to convert DB row to List object
function rowToList(row: any): List {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List Service
export const listService = {
  create(data: CreateListDTO): List {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get the max position for lists
    const maxPosStmt = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM lists'
    );
    const maxPosResult = maxPosStmt.get() as { maxPos: number };
    const position = maxPosResult.maxPos + 1;

    const stmt = db.prepare(`
      INSERT INTO lists (id, name, color, icon, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.color ?? '#3b82f6',
      data.icon ?? '📁',
      position,
      now,
      now
    );

    return this.getById(id)!;
  },

  getById(id: string): List | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM lists WHERE id = ?');
    const row = stmt.get(id);
    return row ? rowToList(row) : null;
  },

  getAll(): List[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM lists ORDER BY position ASC');
    const rows = stmt.all();
    return rows.map(rowToList);
  },

  update(id: string, data: UpdateListDTO): List | null {
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
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon);
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
      `UPDATE lists SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    // Tasks in this list will have their list_id set to NULL due to ON DELETE SET NULL
    const stmt = db.prepare('DELETE FROM lists WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  reorder(listIds: string[]): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE lists SET position = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      listIds.forEach((id, index) => {
        stmt.run(index, now, id);
      });
    });

    transaction();
  },

  getTaskCount(id: string): number {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE list_id = ? AND completed = 0'
    );
    const result = stmt.get(id) as { count: number };
    return result.count;
  },
};
