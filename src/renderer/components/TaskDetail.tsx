import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Priority, Subtask, Tag, RecurrencePattern, RegenerateMode, Weekday } from '../../shared/types';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'text-gray-500' },
  { value: 'low', label: 'Low', color: 'text-green-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-red-500' },
];

const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TaskDetail() {
  const {
    selectedTask,
    setSelectedTaskId,
    updateTask,
    deleteTask,
    lists,
    tags,
    loadTags,
    isTaskDetailOpen,
    setIsTaskDetailOpen,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [listId, setListId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [taskTags, setTaskTags] = useState<Tag[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<Weekday[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [regenerateMode, setRegenerateMode] = useState<RegenerateMode>('on_completion');

  // Update local state when selected task changes
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description);
      setNotes(selectedTask.notes);
      setDueDate(selectedTask.dueDate ?? '');
      setDueTime(selectedTask.dueTime ?? '');
      setPriority(selectedTask.priority);
      setListId(selectedTask.listId);
      setSubtasks(selectedTask.subtasks || []);
      setTaskTags(selectedTask.tags || []);
      setRecurrencePattern(selectedTask.recurrencePattern || 'none');
      setRecurrenceInterval(selectedTask.recurrenceInterval || 1);
      setRecurrenceWeekdays(selectedTask.recurrenceWeekdays || []);
      setRecurrenceEndDate(selectedTask.recurrenceEndDate ?? '');
      setRegenerateMode(selectedTask.regenerateMode || 'on_completion');
    }
  }, [selectedTask]);

  if (!isTaskDetailOpen || !selectedTask) {
    return null;
  }

  const handleClose = () => {
    setIsTaskDetailOpen(false);
    setSelectedTaskId(null);
  };

  const handleSave = async () => {
    await updateTask(selectedTask.id, {
      title,
      description,
      notes,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      priority,
      listId,
    });
  };

  const handleDelete = async () => {
    if (confirm('Delete this task?')) {
      await deleteTask(selectedTask.id);
    }
  };

  const handleAddSubtask = async () => {
    if (newSubtaskTitle.trim()) {
      const subtask = await window.electronAPI.subtask.create({
        taskId: selectedTask.id,
        title: newSubtaskTitle.trim(),
      });
      setSubtasks([...subtasks, subtask]);
      setNewSubtaskTitle('');
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const subtask = subtasks.find(s => s.id === subtaskId);
    if (subtask) {
      await window.electronAPI.subtask.update(subtaskId, {
        completed: !subtask.completed,
      });
      setSubtasks(
        subtasks.map(s =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        )
      );
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await window.electronAPI.subtask.delete(subtaskId);
    setSubtasks(subtasks.filter(s => s.id !== subtaskId));
  };

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      // Check if tag already exists
      let tag = tags.find(t => t.name.toLowerCase() === newTagName.trim().toLowerCase());

      if (!tag) {
        // Create new tag
        tag = await window.electronAPI.tag.create({ name: newTagName.trim() });
        await loadTags();
      }

      // Add tag to task if not already added
      if (!taskTags.find(t => t.id === tag!.id)) {
        await window.electronAPI.tag.addToTask(selectedTask.id, tag.id);
        setTaskTags([...taskTags, tag]);
      }

      setNewTagName('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    await window.electronAPI.tag.removeFromTask(selectedTask.id, tagId);
    setTaskTags(taskTags.filter(t => t.id !== tagId));
  };

  const handleSelectExistingTag = async (tag: Tag) => {
    if (!taskTags.find(t => t.id === tag.id)) {
      await window.electronAPI.tag.addToTask(selectedTask.id, tag.id);
      setTaskTags([...taskTags, tag]);
    }
    setShowTagInput(false);
  };

  // Tags that are not yet assigned to this task
  const availableTags = tags.filter(tag => !taskTags.find(t => t.id === tag.id));

  return (
    <div className="w-96 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Task Details
        </h3>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* List */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            List
          </label>
          <select
            value={listId ?? ''}
            onChange={e => {
              setListId(e.target.value || null);
              updateTask(selectedTask.id, { listId: e.target.value || null });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Inbox (No List)</option>
            {lists.map(list => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {taskTags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full text-white"
                style={{ backgroundColor: tag.color }}
              >
                #{tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:opacity-70"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {!showTagInput && (
              <button
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-full hover:border-primary-500 hover:text-primary-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add tag
              </button>
            )}
          </div>

          {showTagInput && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setShowTagInput(false);
                  }}
                  placeholder="Tag name..."
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowTagInput(false)}
                  className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelectExistingTag(tag)}
                      className="px-2 py-0.5 text-xs rounded-full hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: tag.color, color: 'white' }}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Due date & time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => {
                setDueDate(e.target.value);
                updateTask(selectedTask.id, { dueDate: e.target.value || null });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Time
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={e => {
                setDueTime(e.target.value);
                updateTask(selectedTask.id, { dueTime: e.target.value || null });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority
          </label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setPriority(option.value);
                  updateTask(selectedTask.id, { priority: option.value });
                }}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  priority === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                } ${option.color}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Repeat
          </label>
          <select
            value={recurrencePattern}
            onChange={e => {
              const pattern = e.target.value as RecurrencePattern;
              setRecurrencePattern(pattern);
              updateTask(selectedTask.id, { recurrencePattern: pattern });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {RECURRENCE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Additional recurrence options */}
          {recurrencePattern !== 'none' && (
            <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {/* Interval */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Every</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={recurrenceInterval}
                  onChange={e => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setRecurrenceInterval(val);
                    updateTask(selectedTask.id, { recurrenceInterval: val });
                  }}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {recurrencePattern === 'daily' && (recurrenceInterval === 1 ? 'day' : 'days')}
                  {recurrencePattern === 'weekly' && (recurrenceInterval === 1 ? 'week' : 'weeks')}
                  {recurrencePattern === 'monthly' && (recurrenceInterval === 1 ? 'month' : 'months')}
                  {recurrencePattern === 'yearly' && (recurrenceInterval === 1 ? 'year' : 'years')}
                  {recurrencePattern === 'custom' && (recurrenceInterval === 1 ? 'day' : 'days')}
                </span>
              </div>

              {/* Weekdays for weekly recurrence */}
              {recurrencePattern === 'weekly' && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">On</span>
                  <div className="flex gap-1">
                    {WEEKDAY_NAMES.map((day, index) => (
                      <button
                        key={day}
                        onClick={() => {
                          const newWeekdays = recurrenceWeekdays.includes(index as Weekday)
                            ? recurrenceWeekdays.filter(d => d !== index)
                            : [...recurrenceWeekdays, index as Weekday].sort((a, b) => a - b);
                          setRecurrenceWeekdays(newWeekdays);
                          updateTask(selectedTask.id, { recurrenceWeekdays: newWeekdays });
                        }}
                        className={`w-9 h-9 text-xs rounded-full transition-colors ${
                          recurrenceWeekdays.includes(index as Weekday)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate mode */}
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">When completed</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRegenerateMode('on_completion');
                      updateTask(selectedTask.id, { regenerateMode: 'on_completion' });
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      regenerateMode === 'on_completion'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    From completion date
                  </button>
                  <button
                    onClick={() => {
                      setRegenerateMode('fixed_schedule');
                      updateTask(selectedTask.id, { regenerateMode: 'fixed_schedule' });
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      regenerateMode === 'fixed_schedule'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    From due date
                  </button>
                </div>
              </div>

              {/* End date */}
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">End date (optional)</span>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={e => {
                    setRecurrenceEndDate(e.target.value);
                    updateTask(selectedTask.id, { recurrenceEndDate: e.target.value || null });
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={handleSave}
            rows={3}
            placeholder="Add a description..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
          />
        </div>

        {/* Subtasks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
          </label>

          <div className="space-y-2">
            {subtasks.map(subtask => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 group"
              >
                <button
                  onClick={() => handleToggleSubtask(subtask.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border-2 transition-colors ${
                    subtask.completed
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-400'
                  }`}
                >
                  {subtask.completed && (
                    <svg
                      className="w-full h-full text-white"
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
                <span
                  className={`flex-1 text-sm ${
                    subtask.completed
                      ? 'line-through text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {subtask.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-opacity"
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                placeholder="Add a subtask..."
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              />
              <button
                onClick={handleAddSubtask}
                className="p-1 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
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
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleSave}
            rows={4}
            placeholder="Add notes (supports markdown)..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none font-mono text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          Delete Task
        </button>
      </div>
    </div>
  );
}
