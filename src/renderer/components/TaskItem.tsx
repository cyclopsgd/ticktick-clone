import React from 'react';
import type { Task, Priority } from '../../shared/types';
import { useApp } from '../contexts/AppContext';

interface TaskItemProps {
  task: Task;
}

const priorityColors: Record<Priority, string> = {
  none: 'border-gray-400 dark:border-gray-500',
  low: 'border-green-500',
  medium: 'border-yellow-500',
  high: 'border-red-500',
};

const priorityBgColors: Record<Priority, string> = {
  none: 'bg-gray-400 dark:bg-gray-500',
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export function TaskItem({ task }: TaskItemProps) {
  const { toggleTaskComplete, setSelectedTaskId } = useApp();

  const formatDueDate = (date: string | null): string | null => {
    if (!date) return null;

    const dueDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);

    if (dueDateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else if (dueDateOnly < today) {
      return 'Overdue';
    } else {
      return dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const dueDateText = formatDueDate(task.dueDate);
  const isOverdue = dueDateText === 'Overdue';

  return (
    <div
      className="task-item flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer"
      onClick={() => setSelectedTaskId(task.id)}
    >
      {/* Checkbox */}
      <button
        onClick={e => {
          e.stopPropagation();
          toggleTaskComplete(task.id);
        }}
        className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 transition-colors ${
          priorityColors[task.priority]
        } ${task.completed ? priorityBgColors[task.priority] : ''}`}
      >
        {task.completed && (
          <svg
            className="w-full h-full text-white p-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            task.completed
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {task.title}
        </p>

        {/* Task metadata */}
        <div className="flex items-center gap-3 mt-1">
          {dueDateText && (
            <span
              className={`text-xs ${
                isOverdue
                  ? 'text-red-500'
                  : dueDateText === 'Today'
                  ? 'text-primary-500'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {task.dueTime
                ? `${dueDateText} at ${task.dueTime}`
                : dueDateText}
            </span>
          )}

          {task.priority !== 'none' && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded priority-${task.priority}`}
            >
              {task.priority}
            </span>
          )}

          {task.description && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <svg
                className="w-3 h-3 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
