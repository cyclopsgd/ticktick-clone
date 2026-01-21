import { Notification, BrowserWindow } from 'electron';
import schedule from 'node-schedule';
import { reminderService } from '../database/reminderService';
import { taskService } from '../database/taskService';
import type { Reminder } from '../shared/types';

// Store scheduled jobs by reminder ID
const scheduledJobs: Map<string, schedule.Job> = new Map();

// Store the main window reference for sending IPC messages
let mainWindowRef: BrowserWindow | null = null;

/**
 * Initialize the reminder manager
 */
export function initReminderManager(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  // Schedule all pending reminders
  scheduleAllPendingReminders();

  // Check for due reminders every minute (as a fallback)
  setInterval(checkDueReminders, 60000);
}

/**
 * Schedule all pending reminders from the database
 */
export function scheduleAllPendingReminders(): void {
  // Cancel all existing jobs
  scheduledJobs.forEach(job => job.cancel());
  scheduledJobs.clear();

  // Get all pending reminders
  const reminders = reminderService.getPending();

  reminders.forEach(reminder => {
    scheduleReminder(reminder);
  });

  console.log(`Scheduled ${reminders.length} reminders`);
}

/**
 * Schedule a single reminder
 */
export function scheduleReminder(reminder: Reminder): void {
  // Cancel existing job if any
  const existingJob = scheduledJobs.get(reminder.id);
  if (existingJob) {
    existingJob.cancel();
  }

  const reminderDate = new Date(reminder.reminderTime);

  // Don't schedule if already in the past
  if (reminderDate <= new Date()) {
    // Trigger immediately if due
    triggerReminder(reminder);
    return;
  }

  // Schedule the job
  const job = schedule.scheduleJob(reminderDate, () => {
    triggerReminder(reminder);
  });

  if (job) {
    scheduledJobs.set(reminder.id, job);
  }
}

/**
 * Cancel a scheduled reminder
 */
export function cancelReminder(reminderId: string): void {
  const job = scheduledJobs.get(reminderId);
  if (job) {
    job.cancel();
    scheduledJobs.delete(reminderId);
  }
}

/**
 * Trigger a reminder notification
 */
async function triggerReminder(reminder: Reminder): Promise<void> {
  // Get the associated task
  const task = taskService.getById(reminder.taskId);
  if (!task) {
    // Task was deleted, mark reminder as triggered
    reminderService.markTriggered(reminder.id);
    return;
  }

  // Don't trigger for completed tasks
  if (task.completed) {
    reminderService.markTriggered(reminder.id);
    return;
  }

  // Show notification
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'Task Reminder',
      body: task.title,
      icon: undefined, // Could add app icon here
      silent: false,
      urgency: task.priority === 'high' ? 'critical' : 'normal',
    });

    notification.on('click', () => {
      // Focus the main window and select the task
      if (mainWindowRef) {
        mainWindowRef.show();
        mainWindowRef.focus();
        mainWindowRef.webContents.send('reminder:clicked', reminder.taskId);
      }
    });

    notification.show();
  }

  // Mark as triggered
  reminderService.markTriggered(reminder.id);

  // Remove from scheduled jobs
  scheduledJobs.delete(reminder.id);

  // Notify the renderer about the triggered reminder
  if (mainWindowRef) {
    mainWindowRef.webContents.send('reminder:triggered', {
      reminderId: reminder.id,
      taskId: reminder.taskId,
      taskTitle: task.title,
    });
  }
}

/**
 * Check for due reminders (fallback mechanism)
 */
function checkDueReminders(): void {
  const dueReminders = reminderService.getDue();

  dueReminders.forEach(reminder => {
    triggerReminder(reminder);
  });
}

/**
 * Add a new reminder and schedule it
 */
export function addAndScheduleReminder(taskId: string, reminderTime: string): Reminder {
  const reminder = reminderService.create({ taskId, reminderTime });
  scheduleReminder(reminder);
  return reminder;
}

/**
 * Snooze a reminder
 */
export function snoozeReminder(reminderId: string, durationMinutes: number): Reminder | null {
  const reminder = reminderService.snooze(reminderId, durationMinutes);
  if (reminder) {
    scheduleReminder(reminder);
  }
  return reminder;
}

/**
 * Delete a reminder and cancel its schedule
 */
export function deleteReminder(reminderId: string): boolean {
  cancelReminder(reminderId);
  return reminderService.delete(reminderId);
}
