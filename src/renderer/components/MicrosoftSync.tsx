import React, { useState, useEffect } from 'react';
import type {
  MicrosoftAccount,
  MicrosoftSyncStatus,
  MicrosoftConfigStatus,
  OneDriveBackup,
  OneDriveBackupSettings,
  OutlookCalendarStatus,
} from '../../shared/types';

interface MicrosoftSyncProps {
  onClose: () => void;
}

type TabType = 'account' | 'todo' | 'calendar' | 'backup';

export function MicrosoftSync({ onClose }: MicrosoftSyncProps) {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [account, setAccount] = useState<MicrosoftAccount | null>(null);
  const [syncStatus, setSyncStatus] = useState<MicrosoftSyncStatus | null>(null);
  const [configStatus, setConfigStatus] = useState<MicrosoftConfigStatus | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<OutlookCalendarStatus | null>(null);
  const [backupSettings, setBackupSettings] = useState<OneDriveBackupSettings | null>(null);
  const [backups, setBackups] = useState<OneDriveBackup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const [signedIn, acc, status, config, calStatus, bkSettings] = await Promise.all([
        window.electronAPI.microsoft.isSignedIn(),
        window.electronAPI.microsoft.getAccount(),
        window.electronAPI.microsoft.getSyncStatus(),
        window.electronAPI.microsoft.getConfigStatus(),
        window.electronAPI.outlook.getStatus(),
        window.electronAPI.onedrive.getSettings(),
      ]);
      setIsSignedIn(signedIn);
      setAccount(acc);
      setSyncStatus(status);
      setConfigStatus(config);
      setCalendarStatus(calStatus);
      setBackupSettings(bkSettings);

      if (signedIn) {
        const backupList = await window.electronAPI.onedrive.listBackups();
        if (backupList.success) {
          setBackups(backupList.backups);
        }
      }
    } catch (err) {
      console.error('Failed to load Microsoft status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.microsoft.signIn();
      if (result.success && result.account) {
        setIsSignedIn(true);
        setAccount(result.account as MicrosoftAccount);
        setMessage({ type: 'success', text: 'Successfully signed in!' });
        await loadStatus();
      } else {
        setMessage({ type: 'error', text: result.error || 'Sign in failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sign in failed' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await window.electronAPI.microsoft.signOut();
      setIsSignedIn(false);
      setAccount(null);
      setBackups([]);
      setMessage({ type: 'success', text: 'Signed out successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sign out failed' });
    }
  };

  const handleSyncTodo = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.microsoft.sync();
      if (result.success) {
        setMessage({ type: 'success', text: `Synced! Pulled ${result.pulled}, pushed ${result.pushed} tasks.` });
        const status = await window.electronAPI.microsoft.getSyncStatus();
        setSyncStatus(status);
      } else {
        setMessage({ type: 'error', text: result.errors.join(', ') || 'Sync failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.outlook.syncCalendar();
      if (result.success) {
        setMessage({ type: 'success', text: `Calendar synced! Created ${result.created}, updated ${result.updated} events.` });
        const status = await window.electronAPI.outlook.getStatus();
        setCalendarStatus(status);
      } else {
        setMessage({ type: 'error', text: result.errors.join(', ') || 'Calendar sync failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Calendar sync failed' });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.onedrive.backup();
      if (result.success) {
        setMessage({ type: 'success', text: `Backup created: ${result.backupName}` });
        const [settings, backupList] = await Promise.all([
          window.electronAPI.onedrive.getSettings(),
          window.electronAPI.onedrive.listBackups(),
        ]);
        setBackupSettings(settings);
        if (backupList.success) setBackups(backupList.backups);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Backup failed' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backupId: string, backupName: string) => {
    if (!confirm(`Restore from "${backupName}"? Your current data will be backed up first.`)) return;

    setMessage(null);
    try {
      const result = await window.electronAPI.onedrive.restore(backupId);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Restore failed' });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Delete this backup?')) return;

    try {
      const result = await window.electronAPI.onedrive.deleteBackup(backupId);
      if (result.success) {
        setBackups(backups.filter(b => b.id !== backupId));
        setMessage({ type: 'success', text: 'Backup deleted' });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    }
  };

  const handleToggleAutoBackup = async () => {
    const newValue = !backupSettings?.autoBackupEnabled;
    await window.electronAPI.onedrive.setAutoBackup(newValue);
    setBackupSettings(prev => prev ? { ...prev, autoBackupEnabled: newValue } : null);
  };

  const handleToggleCalendarSync = async () => {
    const newValue = !calendarStatus?.syncEnabled;
    await window.electronAPI.outlook.setEnabled(newValue);
    setCalendarStatus(prev => prev ? { ...prev, syncEnabled: newValue } : null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tabs = [
    { id: 'account' as TabType, label: 'Account', icon: '👤' },
    { id: 'todo' as TabType, label: 'To Do', icon: '✓' },
    { id: 'calendar' as TabType, label: 'Calendar', icon: '📅' },
    { id: 'backup' as TabType, label: 'Backup', icon: '☁️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-white" viewBox="0 0 23 23" fill="currentColor">
              <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z" />
            </svg>
            <h2 className="text-lg font-semibold text-white">Microsoft Integration</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-white dark:bg-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-4">
                  {configStatus && !configStatus.configured && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">Configuration Required</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Register an app in Azure AD and set the client ID to enable Microsoft features.
                      </p>
                      <a
                        href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                      >
                        Open Azure Portal
                      </a>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account</h3>
                    {isSignedIn && account ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {account.username?.charAt(0).toUpperCase() || 'M'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {account.name || account.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{account.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="text-sm text-red-500 hover:text-red-600 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSignIn}
                        disabled={isSigningIn || (configStatus && !configStatus.configured)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        {isSigningIn ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Signing in...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
                              <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z" />
                            </svg>
                            Sign in with Microsoft
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {isSignedIn && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>Connected services:</p>
                      <ul className="list-disc list-inside ml-2">
                        <li>Microsoft To Do - Task sync</li>
                        <li>Outlook Calendar - Due date events</li>
                        <li>OneDrive - Database backup</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* To Do Tab */}
              {activeTab === 'todo' && (
                <div className="space-y-4">
                  {!isSignedIn ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Sign in to sync with Microsoft To Do
                    </p>
                  ) : (
                    <>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sync Status</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>Last sync: {formatDate(syncStatus?.lastSyncTime || null)}</p>
                          <p>Synced tasks: {syncStatus?.taskCount || 0}</p>
                        </div>
                      </div>

                      <button
                        onClick={handleSyncTodo}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync with To Do'}
                      </button>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tasks will be synced to your default Microsoft To Do list.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div className="space-y-4">
                  {!isSignedIn ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Sign in to sync with Outlook Calendar
                    </p>
                  ) : (
                    <>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Calendar Sync</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>Last sync: {formatDate(calendarStatus?.lastSyncTime || null)}</p>
                          <p>Events created: {calendarStatus?.eventCount || 0}</p>
                        </div>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={calendarStatus?.syncEnabled || false}
                            onChange={handleToggleCalendarSync}
                            className="w-4 h-4 text-blue-500 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Auto-sync when tasks change</span>
                        </label>
                      </div>

                      <button
                        onClick={handleSyncCalendar}
                        disabled={isSyncingCalendar}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        {isSyncingCalendar ? 'Syncing...' : 'Sync Calendar Now'}
                      </button>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tasks with due dates will appear in a "George's Ticker" calendar in Outlook.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Backup Tab */}
              {activeTab === 'backup' && (
                <div className="space-y-4">
                  {!isSignedIn ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Sign in to backup to OneDrive
                    </p>
                  ) : (
                    <>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Backup Settings</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>Last backup: {formatDate(backupSettings?.lastBackupTime || null)}</p>
                        </div>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={backupSettings?.autoBackupEnabled || false}
                            onChange={handleToggleAutoBackup}
                            className="w-4 h-4 text-blue-500 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Auto-backup daily</span>
                        </label>
                      </div>

                      <button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        {isBackingUp ? 'Backing up...' : 'Backup Now'}
                      </button>

                      {backups.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Backups</h4>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {backups.map(backup => (
                              <div
                                key={backup.id}
                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm"
                              >
                                <div>
                                  <p className="font-medium text-gray-700 dark:text-gray-300 text-xs">{backup.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(backup.createdAt)} • {formatSize(backup.size)}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleRestore(backup.id, backup.name)}
                                    className="px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBackup(backup.id)}
                                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Backups are stored in "George's Ticker Backups" folder in your OneDrive.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                }`}>
                  <p className="text-sm">{message.text}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
