import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type {
  PomodoroSession,
  PomodoroSettings,
  PomodoroStats,
  CreatePomodoroSessionDTO,
  UpdatePomodoroSessionDTO,
  PomodoroStatus,
  DEFAULT_POMODORO_SETTINGS,
} from '../shared/types';

// Convert database row to PomodoroSession
function rowToSession(row: any): PomodoroSession {
  return {
    id: row.id,
    taskId: row.task_id,
    status: row.status as PomodoroStatus,
    durationMinutes: row.duration_minutes,
    actualMinutes: row.actual_minutes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

// Convert database row to PomodoroSettings
function rowToSettings(row: any): PomodoroSettings {
  return {
    workDuration: row.work_duration,
    shortBreakDuration: row.short_break_duration,
    longBreakDuration: row.long_break_duration,
    sessionsBeforeLongBreak: row.sessions_before_long_break,
    autoStartBreaks: Boolean(row.auto_start_breaks),
    autoStartWork: Boolean(row.auto_start_work),
    notificationSound: Boolean(row.notification_sound),
  };
}

export const pomodoroService = {
  // Create a new pomodoro session
  create(data: CreatePomodoroSessionDTO): PomodoroSession {
    const db = getDatabase();
    const id = uuidv4();
    const startedAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO pomodoro_sessions (id, task_id, status, duration_minutes, started_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.taskId || null, data.status, data.durationMinutes, startedAt);

    return this.getById(id)!;
  },

  // Get session by ID
  getById(id: string): PomodoroSession | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
    return row ? rowToSession(row) : null;
  },

  // Get all sessions
  getAll(): PomodoroSession[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all();
    return rows.map(rowToSession);
  },

  // Get sessions by task ID
  getByTaskId(taskId: string): PomodoroSession[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM pomodoro_sessions WHERE task_id = ? ORDER BY started_at DESC').all(taskId);
    return rows.map(rowToSession);
  },

  // Get today's completed work sessions
  getTodaySessions(): PomodoroSession[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const rows = db.prepare(`
      SELECT * FROM pomodoro_sessions
      WHERE date(started_at) = ? AND status = 'completed'
      ORDER BY started_at DESC
    `).all(today);
    return rows.map(rowToSession);
  },

  // Update a session
  update(id: string, data: UpdatePomodoroSessionDTO): PomodoroSession | null {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.actualMinutes !== undefined) {
      updates.push('actual_minutes = ?');
      values.push(data.actualMinutes);
    }
    if (data.completedAt !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completedAt);
    }

    if (updates.length === 0) return existing;

    values.push(id);
    db.prepare(`UPDATE pomodoro_sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.getById(id);
  },

  // Delete a session
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM pomodoro_sessions WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Get pomodoro statistics
  getStats(): PomodoroStats {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Total sessions and minutes (only completed work sessions)
    const totals = db.prepare(`
      SELECT COUNT(*) as total_sessions, COALESCE(SUM(actual_minutes), 0) as total_minutes
      FROM pomodoro_sessions
      WHERE status = 'completed' AND actual_minutes > 0
    `).get() as any;

    // Today's sessions and minutes
    const todayStats = db.prepare(`
      SELECT COUNT(*) as sessions, COALESCE(SUM(actual_minutes), 0) as minutes
      FROM pomodoro_sessions
      WHERE date(started_at) = ? AND status = 'completed' AND actual_minutes > 0
    `).get(today) as any;

    // Sessions by task
    const sessionsByTask = db.prepare(`
      SELECT
        ps.task_id as taskId,
        COALESCE(t.title, 'No Task') as taskTitle,
        COUNT(*) as sessions,
        COALESCE(SUM(ps.actual_minutes), 0) as minutes
      FROM pomodoro_sessions ps
      LEFT JOIN tasks t ON ps.task_id = t.id
      WHERE ps.status = 'completed' AND ps.actual_minutes > 0
      GROUP BY ps.task_id
      ORDER BY minutes DESC
      LIMIT 10
    `).all() as any[];

    return {
      totalSessions: totals.total_sessions,
      totalFocusMinutes: totals.total_minutes,
      sessionsToday: todayStats.sessions,
      focusMinutesToday: todayStats.minutes,
      sessionsByTask: sessionsByTask.map(row => ({
        taskId: row.taskId || '',
        taskTitle: row.taskTitle,
        sessions: row.sessions,
        minutes: row.minutes,
      })),
    };
  },

  // Get pomodoro settings
  getSettings(): PomodoroSettings {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM pomodoro_settings WHERE id = 1').get();

    if (!row) {
      // Create default settings if not exists
      db.prepare(`
        INSERT OR IGNORE INTO pomodoro_settings (id) VALUES (1)
      `).run();
      return this.getSettings();
    }

    return rowToSettings(row);
  },

  // Update pomodoro settings
  updateSettings(data: Partial<PomodoroSettings>): PomodoroSettings {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.workDuration !== undefined) {
      updates.push('work_duration = ?');
      values.push(data.workDuration);
    }
    if (data.shortBreakDuration !== undefined) {
      updates.push('short_break_duration = ?');
      values.push(data.shortBreakDuration);
    }
    if (data.longBreakDuration !== undefined) {
      updates.push('long_break_duration = ?');
      values.push(data.longBreakDuration);
    }
    if (data.sessionsBeforeLongBreak !== undefined) {
      updates.push('sessions_before_long_break = ?');
      values.push(data.sessionsBeforeLongBreak);
    }
    if (data.autoStartBreaks !== undefined) {
      updates.push('auto_start_breaks = ?');
      values.push(data.autoStartBreaks ? 1 : 0);
    }
    if (data.autoStartWork !== undefined) {
      updates.push('auto_start_work = ?');
      values.push(data.autoStartWork ? 1 : 0);
    }
    if (data.notificationSound !== undefined) {
      updates.push('notification_sound = ?');
      values.push(data.notificationSound ? 1 : 0);
    }

    if (updates.length > 0) {
      db.prepare(`UPDATE pomodoro_settings SET ${updates.join(', ')} WHERE id = 1`).run(...values);
    }

    return this.getSettings();
  },
};
