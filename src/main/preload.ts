import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  Task,
  Subtask,
  TaskWithSubtasks,
  List,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreateSubtaskDTO,
  UpdateSubtaskDTO,
  CreateListDTO,
  UpdateListDTO,
  SmartListId,
  AppSettings,
} from '../shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI = {
  // Task operations
  task: {
    create: (data: CreateTaskDTO): Promise<Task> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, data),
    getAll: (): Promise<Task[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_ALL),
    getById: (id: string): Promise<TaskWithSubtasks | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_BY_ID, id),
    getByList: (listId: string | null): Promise<Task[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_BY_LIST, listId),
    getSmart: (smartListId: SmartListId): Promise<Task[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_SMART, smartListId),
    update: (id: string, data: UpdateTaskDTO): Promise<Task | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, id, data),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, id),
    reorder: (taskIds: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_REORDER, taskIds),
  },

  // Subtask operations
  subtask: {
    create: (data: CreateSubtaskDTO): Promise<Subtask> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_CREATE, data),
    update: (id: string, data: UpdateSubtaskDTO): Promise<Subtask | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_UPDATE, id, data),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_DELETE, id),
    reorder: (subtaskIds: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_REORDER, subtaskIds),
  },

  // List operations
  list: {
    create: (data: CreateListDTO): Promise<List> =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST_CREATE, data),
    getAll: (): Promise<List[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST_GET_ALL),
    getById: (id: string): Promise<List | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST_GET_BY_ID, id),
    update: (id: string, data: UpdateListDTO): Promise<List | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST_UPDATE, id, data),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST_DELETE, id),
    reorder: (listIds: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST_REORDER, listIds),
  },

  // Settings operations
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  },

  // Theme operations
  theme: {
    get: (): Promise<'light' | 'dark' | 'system'> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),
    set: (theme: 'light' | 'dark' | 'system'): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_SET, theme),
    getSystem: (): Promise<'light' | 'dark'> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_SYSTEM),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer process
export type ElectronAPI = typeof electronAPI;
