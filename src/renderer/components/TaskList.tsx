import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useApp } from '../contexts/AppContext';
import { SortableTaskItem } from './SortableTaskItem';
import { TaskItem } from './TaskItem';
import { SearchBar } from './SearchBar';
import { SMART_LISTS, type SmartListId, type TaskFilter } from '../../shared/types';

export function TaskList() {
  const { tasks, selectedListId, lists, createTask, loadTasks, tags, activeFilter, setActiveFilter } = useApp();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get the current list name
  const getListName = (): string => {
    if (activeFilter) return 'Search Results';

    const smartList = SMART_LISTS.find(sl => sl.id === selectedListId);
    if (smartList) return smartList.name;

    const userList = lists.find(l => l.id === selectedListId);
    return userList?.name ?? 'Tasks';
  };

  // Handle search filter
  const handleSearch = (filter: TaskFilter) => {
    setActiveFilter(filter);
  };

  // Clear search filter
  const handleClearSearch = () => {
    setActiveFilter(null);
  };

  const handleAddTask = async () => {
    if (newTaskTitle.trim()) {
      await createTask(newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskTitle('');
    }
  };

  // Keyboard shortcut for quick add (Ctrl/Cmd + N)
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsAddingTask(true);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  // Focus input when adding task
  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);

  // Separate completed and incomplete tasks
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Only show completed tasks section in non-completed smart list
  const showCompletedSection =
    (selectedListId as SmartListId) !== 'completed' && completedTasks.length > 0;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = incompleteTasks.findIndex(t => t.id === active.id);
      const newIndex = incompleteTasks.findIndex(t => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(incompleteTasks, oldIndex, newIndex);
        const taskIds = newOrder.map(t => t.id);
        await window.electronAPI.task.reorder(taskIds);
        await loadTasks();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {getListName()}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''}
              {activeFilter && ' found'}
            </p>
          </div>
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            tags={tags}
          />
        </div>
      </header>

      {/* Quick add bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100 dark:border-gray-800">
        {isAddingTask ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newTaskTitle.trim()) {
                  setIsAddingTask(false);
                }
              }}
              placeholder="What needs to be done?"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <button
              onClick={handleAddTask}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Task</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
              Ctrl+N
            </span>
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm mt-1">Add a task to get started</p>
          </div>
        ) : (
          <>
            {/* Incomplete tasks with drag and drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={incompleteTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {incompleteTasks.map(task => (
                    <SortableTaskItem key={task.id} task={task} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Completed tasks section */}
            {showCompletedSection && (
              <div className="mt-4">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                  Completed ({completedTasks.length})
                </div>
                {completedTasks.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* Show all tasks in completed view */}
            {(selectedListId as SmartListId) === 'completed' && (
              <div>
                {tasks.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
