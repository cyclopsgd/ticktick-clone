import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { CREATE_TABLES_SQL, MIGRATIONS } from './schema';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function runMigrations(database: Database.Database): void {
  // Create migrations tracking table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Get currently applied migrations
  const rows = database.prepare('SELECT version FROM schema_migrations').all() as { version: number }[];
  const appliedVersions = new Set(rows.map(row => row.version));

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      try {
        database.exec(migration.sql);
        database.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        // Some migrations might fail if columns/tables already exist - that's OK
        console.log(`Migration ${migration.version} had some errors (may be OK if already applied):`, error);
        // Still mark it as applied to avoid re-running
        try {
          database.prepare('INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        } catch {
          // Ignore
        }
      }
    }
  }
}

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ticktick-clone.db');

  console.log('Initializing database at:', dbPath);

  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create base tables
  db.exec(CREATE_TABLES_SQL);

  // Run any pending migrations
  runMigrations(db);

  console.log('Database initialized successfully');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}
