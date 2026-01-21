import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Task, List, SmartListId, TaskWithSubtasks } from '../../shared/types';
import { SMART_LISTS } from '../../shared/types';

interface AppContextType {
  // Lists
  lists: List[];
  loadLists: () => Promise<void>;
  createList: (name: string, color?: string, icon?: string) => Promise<List>;
  updateList: (id: string, data: Partial<List>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;

  // Tasks
  tasks: Task[];
  loadTasks: () => Promise<void>;
  createTask: (title: string, listId?: string | null) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;

  // Selected list/task
  selectedListId: string | SmartListId;
  setSelectedListId: (id: string | SmartListId) => void;
  selectedTask: TaskWithSubtasks | null;
  setSelectedTaskId: (id: string | null) => void;

  // UI state
  isTaskDetailOpen: boolean;
  setIsTaskDetailOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | SmartListId>('inbox');
  const [selectedTask, setSelectedTask] = useState<TaskWithSubtasks | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  // Load lists from database
  const loadLists = useCallback(async () => {
    const loadedLists = await window.electronAPI.list.getAll();
    setLists(loadedLists);
  }, []);

  // Load tasks based on selected list
  const loadTasks = useCallback(async () => {
    let loadedTasks: Task[];

    if (SMART_LISTS.some(sl => sl.id === selectedListId)) {
      loadedTasks = await window.electronAPI.task.getSmart(selectedListId as SmartListId);
    } else {
      loadedTasks = await window.electronAPI.task.getByList(selectedListId);
    }

    setTasks(loadedTasks);
  }, [selectedListId]);

  // Load data on mount and when selected list changes
  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Create a new list
  const createList = useCallback(async (name: string, color?: string, icon?: string) => {
    const newList = await window.electronAPI.list.create({ name, color, icon });
    setLists(prev => [...prev, newList]);
    return newList;
  }, []);

  // Update a list
  const updateList = useCallback(async (id: string, data: Partial<List>) => {
    await window.electronAPI.list.update(id, data);
    await loadLists();
  }, [loadLists]);

  // Delete a list
  const deleteList = useCallback(async (id: string) => {
    await window.electronAPI.list.delete(id);
    await loadLists();
    if (selectedListId === id) {
      setSelectedListId('inbox');
    }
  }, [loadLists, selectedListId]);

  // Create a new task
  const createTask = useCallback(async (title: string, listId?: string | null) => {
    // Determine which list to add the task to
    let targetListId: string | null = null;

    if (listId !== undefined) {
      targetListId = listId;
    } else if (!SMART_LISTS.some(sl => sl.id === selectedListId)) {
      targetListId = selectedListId;
    }

    const newTask = await window.electronAPI.task.create({
      title,
      listId: targetListId,
    });

    await loadTasks();
    return newTask;
  }, [selectedListId, loadTasks]);

  // Update a task
  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    await window.electronAPI.task.update(id, data);
    await loadTasks();

    // Refresh selected task if it's the one being updated
    if (selectedTask?.id === id) {
      const updated = await window.electronAPI.task.getById(id);
      setSelectedTask(updated);
    }
  }, [loadTasks, selectedTask]);

  // Delete a task
  const deleteTask = useCallback(async (id: string) => {
    await window.electronAPI.task.delete(id);
    await loadTasks();

    if (selectedTask?.id === id) {
      setSelectedTask(null);
      setIsTaskDetailOpen(false);
    }
  }, [loadTasks, selectedTask]);

  // Toggle task completion
  const toggleTaskComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      await window.electronAPI.task.update(id, { completed: !task.completed });
      await loadTasks();

      if (selectedTask?.id === id) {
        const updated = await window.electronAPI.task.getById(id);
        setSelectedTask(updated);
      }
    }
  }, [tasks, loadTasks, selectedTask]);

  // Set selected task by ID
  const setSelectedTaskId = useCallback(async (id: string | null) => {
    if (id) {
      const task = await window.electronAPI.task.getById(id);
      setSelectedTask(task);
      setIsTaskDetailOpen(true);
    } else {
      setSelectedTask(null);
      setIsTaskDetailOpen(false);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        lists,
        loadLists,
        createList,
        updateList,
        deleteList,
        tasks,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        selectedListId,
        setSelectedListId,
        selectedTask,
        setSelectedTaskId,
        isTaskDetailOpen,
        setIsTaskDetailOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
