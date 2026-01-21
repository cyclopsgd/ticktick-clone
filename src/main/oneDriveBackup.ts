import { Client } from '@microsoft/microsoft-graph-client';
import { getMicrosoftAccessToken, isMicrosoftSignedIn } from './microsoftAuth';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import Store from 'electron-store';
import 'isomorphic-fetch';

// Store schema type
interface BackupStoreSchema {
  lastBackupTime: string | null;
  autoBackupEnabled: boolean;
  backupFolderId: string | null;
}

// Store for backup settings
const backupStore = new Store({
  name: 'onedrive-backup',
  defaults: {
    lastBackupTime: null,
    autoBackupEnabled: false,
    backupFolderId: null,
  },
}) as Store<BackupStoreSchema> & {
  get<K extends keyof BackupStoreSchema>(key: K): BackupStoreSchema[K];
  set<K extends keyof BackupStoreSchema>(key: K, value: BackupStoreSchema[K]): void;
};

const BACKUP_FOLDER_NAME = "George's Ticker Backups";

// Get Microsoft Graph client
async function getGraphClient(): Promise<Client | null> {
  const token = await getMicrosoftAccessToken();
  if (!token) return null;

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

// Get or create backup folder in OneDrive
async function getOrCreateBackupFolder(): Promise<string | null> {
  if (!isMicrosoftSignedIn()) return null;

  try {
    const client = await getGraphClient();
    if (!client) return null;

    // Check if we have a cached folder ID
    const cachedFolderId = backupStore.get('backupFolderId');
    if (cachedFolderId) {
      // Verify folder still exists
      try {
        await client.api(`/me/drive/items/${cachedFolderId}`).get();
        return cachedFolderId;
      } catch {
        // Folder doesn't exist anymore, clear cache
        backupStore.set('backupFolderId', null);
      }
    }

    // Search for existing folder
    const searchResult = await client
      .api('/me/drive/root/children')
      .filter(`name eq '${BACKUP_FOLDER_NAME}'`)
      .get();

    if (searchResult.value && searchResult.value.length > 0) {
      const folderId = searchResult.value[0].id;
      backupStore.set('backupFolderId', folderId);
      return folderId;
    }

    // Create new folder
    const newFolder = await client.api('/me/drive/root/children').post({
      name: BACKUP_FOLDER_NAME,
      folder: {},
    });

    backupStore.set('backupFolderId', newFolder.id);
    return newFolder.id;
  } catch (error) {
    console.error('Failed to get/create backup folder:', error);
    return null;
  }
}

// Get database file path
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'ticktick-clone.db');
}

// Backup database to OneDrive
export async function backupToOneDrive(): Promise<{
  success: boolean;
  message: string;
  backupName?: string;
}> {
  if (!isMicrosoftSignedIn()) {
    return { success: false, message: 'Not signed in to Microsoft' };
  }

  try {
    const client = await getGraphClient();
    if (!client) {
      return { success: false, message: 'Failed to get Graph client' };
    }

    const folderId = await getOrCreateBackupFolder();
    if (!folderId) {
      return { success: false, message: 'Failed to create backup folder' };
    }

    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      return { success: false, message: 'Database file not found' };
    }

    // Read database file
    const fileContent = fs.readFileSync(dbPath);

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.db`;

    // Upload to OneDrive
    await client
      .api(`/me/drive/items/${folderId}:/${backupName}:/content`)
      .put(fileContent);

    backupStore.set('lastBackupTime', new Date().toISOString());

    return {
      success: true,
      message: 'Backup created successfully',
      backupName,
    };
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Backup failed',
    };
  }
}

// List available backups
export async function listBackups(): Promise<{
  success: boolean;
  backups: { name: string; size: number; createdAt: string; id: string }[];
  message?: string;
}> {
  if (!isMicrosoftSignedIn()) {
    return { success: false, backups: [], message: 'Not signed in to Microsoft' };
  }

  try {
    const client = await getGraphClient();
    if (!client) {
      return { success: false, backups: [], message: 'Failed to get Graph client' };
    }

    const folderId = await getOrCreateBackupFolder();
    if (!folderId) {
      return { success: false, backups: [], message: 'Failed to access backup folder' };
    }

    const result = await client
      .api(`/me/drive/items/${folderId}/children`)
      .orderby('createdDateTime desc')
      .top(20)
      .get();

    const backups = (result.value || [])
      .filter((item: any) => item.name.endsWith('.db'))
      .map((item: any) => ({
        name: item.name,
        size: item.size,
        createdAt: item.createdDateTime,
        id: item.id,
      }));

    return { success: true, backups };
  } catch (error) {
    console.error('Failed to list backups:', error);
    return {
      success: false,
      backups: [],
      message: error instanceof Error ? error.message : 'Failed to list backups',
    };
  }
}

// Restore from backup
export async function restoreFromBackup(backupId: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isMicrosoftSignedIn()) {
    return { success: false, message: 'Not signed in to Microsoft' };
  }

  try {
    const client = await getGraphClient();
    if (!client) {
      return { success: false, message: 'Failed to get Graph client' };
    }

    // Download backup file
    const response = await client
      .api(`/me/drive/items/${backupId}/content`)
      .getStream();

    const dbPath = getDatabasePath();
    const backupPath = dbPath + '.restore-backup';

    // Create a backup of current database first
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    // Write restored file
    const chunks: Buffer[] = [];
    for await (const chunk of response) {
      chunks.push(Buffer.from(chunk));
    }
    const fileContent = Buffer.concat(chunks);
    fs.writeFileSync(dbPath, fileContent);

    return {
      success: true,
      message: 'Database restored successfully. Please restart the app.',
    };
  } catch (error) {
    console.error('Restore failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}

// Delete a backup
export async function deleteBackup(backupId: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isMicrosoftSignedIn()) {
    return { success: false, message: 'Not signed in to Microsoft' };
  }

  try {
    const client = await getGraphClient();
    if (!client) {
      return { success: false, message: 'Failed to get Graph client' };
    }

    await client.api(`/me/drive/items/${backupId}`).delete();

    return { success: true, message: 'Backup deleted' };
  } catch (error) {
    console.error('Delete backup failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

// Get backup settings
export function getBackupSettings(): {
  lastBackupTime: string | null;
  autoBackupEnabled: boolean;
} {
  return {
    lastBackupTime: backupStore.get('lastBackupTime'),
    autoBackupEnabled: backupStore.get('autoBackupEnabled'),
  };
}

// Set auto backup enabled
export function setAutoBackupEnabled(enabled: boolean): void {
  backupStore.set('autoBackupEnabled', enabled);
}

// Check if auto backup is due (e.g., daily)
export function isAutoBackupDue(): boolean {
  if (!backupStore.get('autoBackupEnabled')) return false;

  const lastBackup = backupStore.get('lastBackupTime');
  if (!lastBackup) return true;

  const lastBackupDate = new Date(lastBackup);
  const now = new Date();
  const hoursSinceBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);

  // Backup if more than 24 hours since last backup
  return hoursSinceBackup >= 24;
}
