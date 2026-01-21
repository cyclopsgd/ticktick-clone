import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { useApp } from '../contexts/AppContext';
import { useToast } from './Toast';
import { getEisenhowerQuadrant } from '../utils/taskParser';
import type { Task, EisenhowerQuadrant, Priority } from '../../shared/types';

interface QuadrantConfig {
  id: EisenhowerQuadrant;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dropBgColor: string;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: 'do-first',
    title: 'Do First',
    subtitle: 'Urgent & Important',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-900',
    dropBgColor: 'bg-red-100 dark:bg-red-900/50',
  },
  {
    id: 'schedule',
    title: 'Schedule',
    subtitle: 'Important, Not Urgent',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-900',
    dropBgColor: 'bg-blue-100 dark:bg-blue-900/50',
  },
  {
    id: 'delegate',
    title: 'Delegate',
    subtitle: 'Urgent, Not Important',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-900',
    dropBgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
  },
  {
    id: 'eliminate',
    title: 'Eliminate',
    subtitle: 'Not Urgent or Important',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
    dropBgColor: 'bg-gray-200 dark:bg-gray-700/50',
  },
];

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

function DraggableTask({
  task,
  onSelect,
  onToggleComplete,
}: {
  task: Task;
  onSelect: (id: string) => void;
  onToggleComplete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const [isAnimating, setIsAnimating] = useState(false);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => {
      onToggleComplete(task);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-start gap-2 p-2 rounded-md hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isAnimating ? 'opacity-50 scale-[0.98]' : ''}`}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckboxClick}
        className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 transition-all duration-200 ${
          priorityColors[task.priority]
        } ${isAnimating ? priorityBgColors[task.priority] + ' scale-110' : 'hover:scale-105'}`}
      >
        {isAnimating && (
          <svg
            className="w-full h-full text-white p-0.5 animate-check"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Drag handle and content */}
      <div
        {...listeners}
        {...attributes}
        onClick={() => onSelect(task.id)}
        className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
      >
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
          {task.title}
        </p>
        {task.dueDate && (
          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatDate(task.dueDate)}
            {task.dueTime && ` ${task.dueTime}`}
          </p>
        )}
      </div>
    </div>
  );
}

function TaskOverlay({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 cursor-grabbing">
      <div className="flex-shrink-0 mt-0.5">
        {task.priority === 'high' && <span className="block w-2 h-2 rounded-full bg-red-500" />}
        {task.priority === 'medium' && <span className="block w-2 h-2 rounded-full bg-yellow-500" />}
        {task.priority === 'low' && <span className="block w-2 h-2 rounded-full bg-green-500" />}
        {task.priority === 'none' && <span className="block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) return 'Today';
  if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (taskDate < today) return 'Overdue';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DroppableQuadrant({
  config,
  tasks,
  onSelectTask,
  onToggleComplete,
  onAddTask,
  isOver,
}: {
  config: QuadrantConfig;
  tasks: Task[];
  onSelectTask: (id: string) => void;
  onToggleComplete: (task: Task) => void;
  onAddTask: (title: string, quadrant: EisenhowerQuadrant) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: config.id,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), config.id);
      setNewTaskTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border-2 ${config.borderColor} ${
        isOver ? config.dropBgColor : config.bgColor
      } overflow-hidden transition-colors`}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-inherit">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-sm ${config.color}`}>{config.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{config.subtitle}</p>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="p-1 rounded hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Add task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick add input */}
      {isAdding && (
        <div className="flex-shrink-0 px-2 py-2 border-b border-inherit bg-white/30 dark:bg-black/20">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setIsAdding(false); setNewTaskTitle(''); }
              }}
              placeholder="Task title..."
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              autoFocus
            />
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={handleAddTask}
              className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setIsAdding(false); setNewTaskTitle(''); }}
              className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[100px]">
        {tasks.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            {isOver ? 'Drop here' : 'No tasks'}
          </p>
        ) : (
          tasks.map(task => (
            <DraggableTask
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </div>

      {/* Footer with count */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-inherit bg-white/50 dark:bg-black/20">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

export function EisenhowerMatrix() {
  const { tasks, setSelectedTaskId, updateTask, toggleTaskComplete, createTask } = useApp();
  const { showToast } = useToast();
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [overQuadrant, setOverQuadrant] = React.useState<EisenhowerQuadrant | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Filter to only incomplete tasks
  const incompleteTasks = tasks.filter(t => !t.completed);

  // Group tasks by quadrant
  const tasksByQuadrant = incompleteTasks.reduce(
    (acc, task) => {
      const quadrant = getEisenhowerQuadrant(task.dueDate, task.priority);
      acc[quadrant].push(task);
      return acc;
    },
    {
      'do-first': [] as Task[],
      'schedule': [] as Task[],
      'delegate': [] as Task[],
      'eliminate': [] as Task[],
    }
  );

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleToggleComplete = async (task: Task) => {
    await toggleTaskComplete(task.id);
    showToast(`"${task.title}" completed`, {
      label: 'Undo',
      onClick: async () => {
        await updateTask(task.id, { completed: false });
      },
    });
  };

  const handleAddTask = async (title: string, quadrant: EisenhowerQuadrant) => {
    // Determine priority and due date based on quadrant
    const isImportant = quadrant === 'do-first' || quadrant === 'schedule';
    const isUrgent = quadrant === 'do-first' || quadrant === 'delegate';

    const priority: Priority = isImportant ? 'high' : 'low';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dueDate: string | undefined;
    if (isUrgent) {
      dueDate = today.toISOString().split('T')[0];
    } else {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      dueDate = nextWeek.toISOString().split('T')[0];
    }

    await createTask(title, { priority, dueDate });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as EisenhowerQuadrant | undefined;
    setOverQuadrant(overId || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    setOverQuadrant(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const targetQuadrant = over.id as EisenhowerQuadrant;
    const task = incompleteTasks.find(t => t.id === taskId);

    if (!task) return;

    const currentQuadrant = getEisenhowerQuadrant(task.dueDate, task.priority);
    if (currentQuadrant === targetQuadrant) return;

    // Determine new priority and due date based on target quadrant
    const updates: Partial<Task> = {};

    // Importance (vertical axis) → Priority
    const isImportant = targetQuadrant === 'do-first' || targetQuadrant === 'schedule';
    if (isImportant && (task.priority === 'none' || task.priority === 'low')) {
      updates.priority = 'high';
    } else if (!isImportant && (task.priority === 'high' || task.priority === 'medium')) {
      updates.priority = 'low';
    }

    // Urgency (horizontal axis) → Due date
    const isUrgent = targetQuadrant === 'do-first' || targetQuadrant === 'delegate';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isUrgent) {
      // Make urgent: set due date to today if not already urgent
      const currentlyUrgent = task.dueDate && new Date(task.dueDate) <= new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      if (!currentlyUrgent) {
        updates.dueDate = today.toISOString().split('T')[0];
      }
    } else {
      // Make not urgent: push due date to next week or remove it
      if (task.dueDate) {
        const taskDate = new Date(task.dueDate);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        if (taskDate < dayAfterTomorrow) {
          // Task is currently urgent, push to next week
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          updates.dueDate = nextWeek.toISOString().split('T')[0];
        }
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await updateTask(taskId, updates);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Eisenhower Matrix
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''} to organize
              <span className="ml-2 text-xs">(drag tasks to reorganize)</span>
            </p>
          </div>
        </div>
      </header>

      {/* Matrix Grid with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 p-4 overflow-hidden">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {QUADRANTS.map(config => (
              <DroppableQuadrant
                key={config.id}
                config={config}
                tasks={tasksByQuadrant[config.id]}
                onSelectTask={handleSelectTask}
                onToggleComplete={handleToggleComplete}
                onAddTask={handleAddTask}
                isOver={overQuadrant === config.id}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
