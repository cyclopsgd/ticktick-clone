import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import type { PomodoroSession, PomodoroSettings, PomodoroStatus, Task } from '../../shared/types';

interface PomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TimerState = 'idle' | 'running' | 'paused';

export function PomodoroTimer({ isOpen, onClose }: PomodoroTimerProps) {
  const { tasks, selectedTask } = useApp();
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [currentPhase, setCurrentPhase] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // seconds
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<{ sessionsToday: number; focusMinutesToday: number }>({
    sessionsToday: 0,
    focusMinutesToday: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Load settings and stats on mount
  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  // Set linked task to selected task when it changes
  useEffect(() => {
    if (selectedTask && timerState === 'idle') {
      setLinkedTaskId(selectedTask.id);
    }
  }, [selectedTask, timerState]);

  // Update time remaining when settings change
  useEffect(() => {
    if (settings && timerState === 'idle') {
      const duration = getDurationForPhase(currentPhase, settings);
      setTimeRemaining(duration * 60);
    }
  }, [settings, currentPhase, timerState]);

  const loadSettings = async () => {
    const loadedSettings = await window.electronAPI.pomodoro.getSettings();
    setSettings(loadedSettings);
    setTimeRemaining(loadedSettings.workDuration * 60);
  };

  const loadStats = async () => {
    const loadedStats = await window.electronAPI.pomodoro.getStats();
    setStats({
      sessionsToday: loadedStats.sessionsToday,
      focusMinutesToday: loadedStats.focusMinutesToday,
    });
  };

  const getDurationForPhase = (phase: 'work' | 'short_break' | 'long_break', s: PomodoroSettings): number => {
    switch (phase) {
      case 'work':
        return s.workDuration;
      case 'short_break':
        return s.shortBreakDuration;
      case 'long_break':
        return s.longBreakDuration;
    }
  };

  const startTimer = useCallback(async () => {
    if (!settings) return;

    if (timerState === 'paused' && currentSession) {
      // Resume existing session
      setTimerState('running');
      startTimeRef.current = Date.now();
    } else {
      // Start new session
      const session = await window.electronAPI.pomodoro.createSession({
        taskId: currentPhase === 'work' ? linkedTaskId : null,
        status: currentPhase,
        durationMinutes: getDurationForPhase(currentPhase, settings),
      });
      setCurrentSession(session);
      setTimerState('running');
      startTimeRef.current = Date.now();
      elapsedRef.current = 0;
    }
  }, [settings, timerState, currentSession, currentPhase, linkedTaskId]);

  const pauseTimer = useCallback(() => {
    setTimerState('paused');
    if (startTimeRef.current) {
      elapsedRef.current += (Date.now() - startTimeRef.current) / 1000;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimerState('idle');
    setCurrentSession(null);
    elapsedRef.current = 0;
    if (settings) {
      setTimeRemaining(getDurationForPhase(currentPhase, settings) * 60);
    }
  }, [settings, currentPhase]);

  const completeSession = useCallback(async () => {
    if (!currentSession || !settings) return;

    const actualMinutes = Math.round(elapsedRef.current / 60);

    await window.electronAPI.pomodoro.update(currentSession.id, {
      status: 'completed',
      actualMinutes,
      completedAt: new Date().toISOString(),
    });

    // Show notification
    if (settings.notificationSound) {
      new Notification('Pomodoro Complete!', {
        body: currentPhase === 'work'
          ? `Great work! Take a ${sessionsCompleted + 1 >= settings.sessionsBeforeLongBreak ? 'long' : 'short'} break.`
          : 'Break is over! Ready to focus?',
      });
    }

    if (currentPhase === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCompleted);

      // Determine next break type
      const nextPhase = newSessionsCompleted % settings.sessionsBeforeLongBreak === 0
        ? 'long_break'
        : 'short_break';
      setCurrentPhase(nextPhase);
      setTimeRemaining(getDurationForPhase(nextPhase, settings) * 60);

      // Auto-start break if enabled
      if (settings.autoStartBreaks) {
        setTimeout(() => startTimer(), 1000);
      } else {
        setTimerState('idle');
        setCurrentSession(null);
      }
    } else {
      // Break completed, go back to work
      setCurrentPhase('work');
      setTimeRemaining(settings.workDuration * 60);

      // Auto-start work if enabled
      if (settings.autoStartWork) {
        setTimeout(() => startTimer(), 1000);
      } else {
        setTimerState('idle');
        setCurrentSession(null);
      }
    }

    elapsedRef.current = 0;
    loadStats();
  }, [currentSession, settings, currentPhase, sessionsCompleted, startTimer]);

  // Timer tick effect
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, completeSession]);

  // Track elapsed time
  useEffect(() => {
    if (timerState === 'running') {
      const trackInterval = setInterval(() => {
        elapsedRef.current = (Date.now() - startTimeRef.current) / 1000;
      }, 1000);
      return () => clearInterval(trackInterval);
    }
  }, [timerState]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = (phase: 'work' | 'short_break' | 'long_break'): string => {
    switch (phase) {
      case 'work':
        return 'Focus Time';
      case 'short_break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
    }
  };

  const getPhaseColor = (phase: 'work' | 'short_break' | 'long_break'): string => {
    switch (phase) {
      case 'work':
        return 'text-red-500';
      case 'short_break':
        return 'text-green-500';
      case 'long_break':
        return 'text-blue-500';
    }
  };

  const updateSettings = async (updates: Partial<PomodoroSettings>) => {
    const updated = await window.electronAPI.pomodoro.updateSettings(updates);
    setSettings(updated);
  };

  const incompleteTasks = tasks.filter(t => !t.completed);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pomodoro Timer</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {showSettings && settings ? (
          /* Settings Panel */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Work Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workDuration}
                onChange={(e) => updateSettings({ workDuration: parseInt(e.target.value) || 25 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Short Break (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.shortBreakDuration}
                onChange={(e) => updateSettings({ shortBreakDuration: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Long Break (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakDuration}
                onChange={(e) => updateSettings({ longBreakDuration: parseInt(e.target.value) || 15 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sessions before Long Break
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.sessionsBeforeLongBreak}
                onChange={(e) => updateSettings({ sessionsBeforeLongBreak: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-start Breaks</span>
              <button
                onClick={() => updateSettings({ autoStartBreaks: !settings.autoStartBreaks })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoStartBreaks ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoStartBreaks ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-start Work</span>
              <button
                onClick={() => updateSettings({ autoStartWork: !settings.autoStartWork })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoStartWork ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoStartWork ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Notification Sound</span>
              <button
                onClick={() => updateSettings({ notificationSound: !settings.notificationSound })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notificationSound ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationSound ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        ) : (
          /* Timer Panel */
          <div className="p-6">
            {/* Phase indicator */}
            <div className="text-center mb-4">
              <span className={`text-sm font-medium ${getPhaseColor(currentPhase)}`}>
                {getPhaseLabel(currentPhase)}
              </span>
            </div>

            {/* Timer display */}
            <div className="text-center mb-6">
              <div className={`text-7xl font-mono font-bold ${getPhaseColor(currentPhase)}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>

            {/* Session progress */}
            <div className="flex justify-center gap-2 mb-6">
              {settings && Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < sessionsCompleted
                      ? 'bg-red-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Linked task selector */}
            {currentPhase === 'work' && timerState === 'idle' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Task (optional)
                </label>
                <select
                  value={linkedTaskId || ''}
                  onChange={(e) => setLinkedTaskId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">No task linked</option>
                  {incompleteTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Linked task display during session */}
            {currentPhase === 'work' && timerState !== 'idle' && linkedTaskId && (
              <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Working on:</div>
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  {incompleteTasks.find(t => t.id === linkedTaskId)?.title || 'Task'}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {timerState === 'idle' && (
                <button
                  onClick={startTimer}
                  className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors"
                >
                  Start
                </button>
              )}
              {timerState === 'running' && (
                <>
                  <button
                    onClick={pauseTimer}
                    className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-medium transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={resetTimer}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-full font-medium transition-colors"
                  >
                    Reset
                  </button>
                </>
              )}
              {timerState === 'paused' && (
                <>
                  <button
                    onClick={startTimer}
                    className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={resetTimer}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-full font-medium transition-colors"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* Phase switcher (only when idle) */}
            {timerState === 'idle' && (
              <div className="flex justify-center gap-2 mt-6">
                {(['work', 'short_break', 'long_break'] as const).map(phase => (
                  <button
                    key={phase}
                    onClick={() => {
                      setCurrentPhase(phase);
                      if (settings) {
                        setTimeRemaining(getDurationForPhase(phase, settings) * 60);
                      }
                    }}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      currentPhase === phase
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {getPhaseLabel(phase)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer with stats */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sessionsToday}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sessions Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.focusMinutesToday}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Focus Minutes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
