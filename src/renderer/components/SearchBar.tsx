import React, { useState, useEffect, useRef } from 'react';
import type { Tag, Priority, TaskFilter } from '../../shared/types';

interface SearchBarProps {
  onSearch: (filter: TaskFilter) => void;
  onClear: () => void;
  tags: Tag[];
}

export function SearchBar({ onSearch, onClear, tags }: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'high', label: 'High', color: 'bg-red-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low', color: 'bg-green-500' },
  ];

  const handleSearch = () => {
    const filter: TaskFilter = {};

    if (searchQuery.trim()) {
      filter.searchQuery = searchQuery.trim();
    }
    if (selectedTags.length > 0) {
      filter.tagIds = selectedTags;
    }
    if (selectedPriorities.length > 0) {
      filter.priorities = selectedPriorities;
    }

    if (Object.keys(filter).length > 0) {
      onSearch(filter);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedPriorities([]);
    setIsExpanded(false);
    setShowFilters(false);
    onClear();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const togglePriority = (priority: Priority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  // Keyboard shortcut for search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isExpanded) {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [isExpanded]);

  // Auto-search on filter changes
  useEffect(() => {
    if (searchQuery || selectedTags.length > 0 || selectedPriorities.length > 0) {
      handleSearch();
    }
  }, [selectedTags, selectedPriorities]);

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedPriorities.length > 0;

  if (!isExpanded) {
    return (
      <button
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Search (Ctrl+F)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          placeholder="Search tasks..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1 rounded transition-colors ${
            hasActiveFilters
              ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/30'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
          title="Filters"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </button>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            title="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Filter dropdown */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
          {/* Tags filter */}
          {tags.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
                    }`}
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                    }}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priority filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {priorities.map(priority => (
                <button
                  key={priority.value}
                  onClick={() => togglePriority(priority.value)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedPriorities.includes(priority.value)
                      ? `${priority.color} text-white`
                      : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
