import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type { Reminder, CreateReminderDTO, UpdateReminderDTO } from '../shared/types';

// Helper to convert DB row to Reminder object
function rowToReminder(row: any): Reminder {
  return {
    id: row.id,
    taskId: row.task_id,
    reminderTime: row.reminder_time,
    triggered: Boolean(row.triggered),
    snoozedUntil: row.snoozed_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const reminderService = {
  create(data: CreateReminderDTO): Reminder {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reminders (id, task_id, reminder_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.taskId, data.reminderTime, now, now);

    return this.getById(id)!;
  },

  getById(id: string): Reminder | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM reminders WHERE id = ?');
    const row = stmt.get(id);
    return row ? rowToReminder(row) : null;
  },

  getByTaskId(taskId: string): Reminder[] {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM reminders WHERE task_id = ? ORDER BY reminder_time ASC'
    );
    const rows = stmt.all(taskId);
    return rows.map(rowToReminder);
  },

  getPending(): Reminder[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM reminders
      WHERE triggered = 0
      AND (snoozed_until IS NULL OR snoozed_until <= datetime('now'))
      ORDER BY reminder_time ASC
    `);
    const rows = stmt.all();
    return rows.map(rowToReminder);
  },

  getDue(): Reminder[] {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM reminders
      WHERE triggered = 0
      AND reminder_time <= ?
      AND (snoozed_until IS NULL OR snoozed_until <= ?)
      ORDER BY reminder_time ASC
    `);
    const rows = stmt.all(now, now);
    return rows.map(rowToReminder);
  },

  update(id: string, data: UpdateReminderDTO): Reminder | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.reminderTime !== undefined) {
      updates.push('reminder_time = ?');
      values.push(data.reminderTime);
    }
    if (data.triggered !== undefined) {
      updates.push('triggered = ?');
      values.push(data.triggered ? 1 : 0);
    }
    if (data.snoozedUntil !== undefined) {
      updates.push('snoozed_until = ?');
      values.push(data.snoozedUntil);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM reminders WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  markTriggered(id: string): Reminder | null {
    return this.update(id, { triggered: true });
  },

  snooze(id: string, duration: number): Reminder | null {
    // duration is in minutes
    const snoozedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
    return this.update(id, { snoozedUntil, triggered: false });
  },

  deleteByTaskId(taskId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM reminders WHERE task_id = ?');
    const result = stmt.run(taskId);
    return result.changes > 0;
  },
};
