import { ipcMain, nativeTheme } from 'electron';
import { IPC_CHANNELS, DEFAULT_SETTINGS, type AppSettings } from '../shared/types';
import { taskService, subtaskService } from '../database/taskService';
import { listService } from '../database/listService';
import { tagService, searchService } from '../database/tagService';
import { recurrenceService } from '../database/recurrenceService';

// Settings stored in memory (will be persisted to database later)
let settings: AppSettings = { ...DEFAULT_SETTINGS };

export function setupIpcHandlers(): void {
  // Task handlers
  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, (_event, data) => {
    return taskService.create(data);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_GET_ALL, () => {
    return taskService.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.TASK_GET_BY_ID, (_event, id) => {
    return taskService.getByIdWithSubtasks(id);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_GET_BY_LIST, (_event, listId) => {
    return taskService.getByListId(listId);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_GET_SMART, (_event, smartListId) => {
    return taskService.getSmartList(smartListId);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, (_event, id, data) => {
    return taskService.update(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, (_event, id) => {
    return taskService.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_REORDER, (_event, taskIds) => {
    return taskService.reorder(taskIds);
  });

  ipcMain.handle(IPC_CHANNELS.TASK_COMPLETE_RECURRING, (_event, taskId) => {
    return recurrenceService.completeRecurringTask(taskId);
  });

  // Subtask handlers
  ipcMain.handle(IPC_CHANNELS.SUBTASK_CREATE, (_event, data) => {
    return subtaskService.create(data);
  });

  ipcMain.handle(IPC_CHANNELS.SUBTASK_UPDATE, (_event, id, data) => {
    return subtaskService.update(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.SUBTASK_DELETE, (_event, id) => {
    return subtaskService.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.SUBTASK_REORDER, (_event, subtaskIds) => {
    return subtaskService.reorder(subtaskIds);
  });

  // List handlers
  ipcMain.handle(IPC_CHANNELS.LIST_CREATE, (_event, data) => {
    return listService.create(data);
  });

  ipcMain.handle(IPC_CHANNELS.LIST_GET_ALL, () => {
    return listService.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_GET_BY_ID, (_event, id) => {
    return listService.getById(id);
  });

  ipcMain.handle(IPC_CHANNELS.LIST_UPDATE, (_event, id, data) => {
    return listService.update(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.LIST_DELETE, (_event, id) => {
    return listService.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.LIST_REORDER, (_event, listIds) => {
    return listService.reorder(listIds);
  });

  // Tag handlers
  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, (_event, data) => {
    return tagService.create(data);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_GET_ALL, () => {
    return tagService.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.TAG_UPDATE, (_event, id, data) => {
    return tagService.update(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, (_event, id) => {
    return tagService.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_ADD_TO_TASK, (_event, taskId, tagId) => {
    return tagService.addTagToTask(taskId, tagId);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_REMOVE_FROM_TASK, (_event, taskId, tagId) => {
    return tagService.removeTagFromTask(taskId, tagId);
  });

  // Search handlers
  ipcMain.handle(IPC_CHANNELS.TASK_SEARCH, (_event, filter) => {
    return searchService.searchTasks(filter);
  });

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return settings;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, newSettings: Partial<AppSettings>) => {
    settings = { ...settings, ...newSettings };
    return settings;
  });

  // Theme handlers
  ipcMain.handle(IPC_CHANNELS.THEME_GET, () => {
    return settings.theme;
  });

  ipcMain.handle(IPC_CHANNELS.THEME_SET, (_event, theme: 'light' | 'dark' | 'system') => {
    settings.theme = theme;
    // Update native theme source
    if (theme === 'system') {
      nativeTheme.themeSource = 'system';
    } else {
      nativeTheme.themeSource = theme;
    }
  });

  ipcMain.handle(IPC_CHANNELS.THEME_GET_SYSTEM, () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });
}
