import { Client } from '@microsoft/microsoft-graph-client';
import { getMicrosoftAccessToken, isMicrosoftSignedIn } from './microsoftAuth';
import { taskService } from '../database/taskService';
import type { Task } from '../shared/types';
import Store from 'electron-store';
import 'isomorphic-fetch';

// Store schema type
interface CalendarStoreSchema {
  lastSyncTime: string | null;
  calendarId: string | null;
  eventMappings: Record<string, string>; // taskId -> eventId
  syncEnabled: boolean;
}

// Store for calendar sync settings
const calendarStore = new Store({
  name: 'outlook-calendar',
  defaults: {
    lastSyncTime: null,
    calendarId: null,
    eventMappings: {},
    syncEnabled: false,
  },
}) as Store<CalendarStoreSchema> & {
  get<K extends keyof CalendarStoreSchema>(key: K): CalendarStoreSchema[K];
  set<K extends keyof CalendarStoreSchema>(key: K, value: CalendarStoreSchema[K]): void;
  clear(): void;
};

const CALENDAR_NAME = "George's Ticker";

// Outlook event interface
interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay?: boolean;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  categories?: string[];
  importance?: 'low' | 'normal' | 'high';
}

// Get Microsoft Graph client
async function getGraphClient(): Promise<Client | null> {
  const token = await getMicrosoftAccessToken();
  if (!token) return null;

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

// Get or create dedicated calendar
async function getOrCreateCalendar(): Promise<string | null> {
  if (!isMicrosoftSignedIn()) return null;

  try {
    const client = await getGraphClient();
    if (!client) return null;

    // Check cached calendar ID
    const cachedCalendarId = calendarStore.get('calendarId');
    if (cachedCalendarId) {
      try {
        await client.api(`/me/calendars/${cachedCalendarId}`).get();
        return cachedCalendarId;
      } catch {
        calendarStore.set('calendarId', null);
      }
    }

    // Search for existing calendar
    const calendars = await client.api('/me/calendars').get();
    const existingCalendar = calendars.value?.find(
      (cal: any) => cal.name === CALENDAR_NAME
    );

    if (existingCalendar) {
      calendarStore.set('calendarId', existingCalendar.id);
      return existingCalendar.id;
    }

    // Create new calendar
    const newCalendar = await client.api('/me/calendars').post({
      name: CALENDAR_NAME,
    });

    calendarStore.set('calendarId', newCalendar.id);
    return newCalendar.id;
  } catch (error) {
    console.error('Failed to get/create calendar:', error);
    return null;
  }
}

// Convert task to Outlook event
function taskToEvent(task: Task): OutlookEvent | null {
  if (!task.dueDate) return null;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let startDateTime: string;
  let endDateTime: string;
  let isAllDay = false;

  if (task.dueTime) {
    // Specific time - create 1 hour event
    startDateTime = `${task.dueDate}T${task.dueTime}:00`;
    const endDate = new Date(`${task.dueDate}T${task.dueTime}:00`);
    endDate.setHours(endDate.getHours() + 1);
    endDateTime = endDate.toISOString().slice(0, 19);
  } else {
    // All day event
    startDateTime = `${task.dueDate}T00:00:00`;
    endDateTime = `${task.dueDate}T23:59:59`;
    isAllDay = true;
  }

  const event: OutlookEvent = {
    subject: task.completed ? `✓ ${task.title}` : task.title,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
    isAllDay,
    showAs: task.completed ? 'free' : 'busy',
    importance: task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'normal',
  };

  if (task.description || task.notes) {
    event.body = {
      contentType: 'text',
      content: task.description || task.notes || '',
    };
  }

  // Add priority category
  if (task.priority !== 'none') {
    event.categories = [`Priority: ${task.priority}`];
  }

  return event;
}

// Create event in Outlook
export async function createCalendarEvent(task: Task): Promise<string | null> {
  if (!isMicrosoftSignedIn() || !task.dueDate) return null;

  try {
    const client = await getGraphClient();
    if (!client) return null;

    const calendarId = await getOrCreateCalendar();
    if (!calendarId) return null;

    const event = taskToEvent(task);
    if (!event) return null;

    const response = await client
      .api(`/me/calendars/${calendarId}/events`)
      .post(event);

    // Store mapping
    const mappings = calendarStore.get('eventMappings') || {};
    mappings[task.id] = response.id;
    calendarStore.set('eventMappings', mappings);

    return response.id;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

// Update event in Outlook
export async function updateCalendarEvent(task: Task): Promise<boolean> {
  if (!isMicrosoftSignedIn()) return false;

  const mappings = calendarStore.get('eventMappings') || {};
  const eventId = mappings[task.id];

  // If task no longer has due date, delete the event
  if (!task.dueDate) {
    if (eventId) {
      await deleteCalendarEvent(task.id);
    }
    return true;
  }

  // If no existing event, create one
  if (!eventId) {
    await createCalendarEvent(task);
    return true;
  }

  try {
    const client = await getGraphClient();
    if (!client) return false;

    const calendarId = await getOrCreateCalendar();
    if (!calendarId) return false;

    const event = taskToEvent(task);
    if (!event) return false;

    await client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .patch(event);

    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    // Event might not exist anymore, try creating new one
    delete mappings[task.id];
    calendarStore.set('eventMappings', mappings);
    await createCalendarEvent(task);
    return false;
  }
}

// Delete event from Outlook
export async function deleteCalendarEvent(taskId: string): Promise<boolean> {
  if (!isMicrosoftSignedIn()) return false;

  const mappings = calendarStore.get('eventMappings') || {};
  const eventId = mappings[taskId];

  if (!eventId) return true;

  try {
    const client = await getGraphClient();
    if (!client) return false;

    const calendarId = await getOrCreateCalendar();
    if (!calendarId) return false;

    await client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .delete();

    delete mappings[taskId];
    calendarStore.set('eventMappings', mappings);

    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    // Remove mapping anyway
    delete mappings[taskId];
    calendarStore.set('eventMappings', mappings);
    return false;
  }
}

// Full sync - push all tasks with due dates to calendar
export async function syncCalendar(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = { success: false, created: 0, updated: 0, errors: [] as string[] };

  if (!isMicrosoftSignedIn()) {
    result.errors.push('Not signed in to Microsoft');
    return result;
  }

  try {
    const client = await getGraphClient();
    if (!client) {
      result.errors.push('Failed to get Graph client');
      return result;
    }

    const calendarId = await getOrCreateCalendar();
    if (!calendarId) {
      result.errors.push('Failed to create calendar');
      return result;
    }

    // Get all tasks with due dates
    const allTasks = taskService.getAll();
    const tasksWithDueDate = allTasks.filter(t => t.dueDate);

    const mappings = calendarStore.get('eventMappings') || {};

    for (const task of tasksWithDueDate) {
      try {
        const existingEventId = mappings[task.id];

        if (existingEventId) {
          // Update existing event
          await updateCalendarEvent(task);
          result.updated++;
        } else {
          // Create new event
          await createCalendarEvent(task);
          result.created++;
        }
      } catch (error) {
        result.errors.push(`Failed to sync task: ${task.title}`);
      }
    }

    calendarStore.set('lastSyncTime', new Date().toISOString());
    result.success = true;

    return result;
  } catch (error) {
    console.error('Calendar sync error:', error);
    result.errors.push(error instanceof Error ? error.message : 'Sync failed');
    return result;
  }
}

// Get calendar sync status
export function getCalendarSyncStatus(): {
  lastSyncTime: string | null;
  eventCount: number;
  syncEnabled: boolean;
} {
  const mappings = calendarStore.get('eventMappings') || {};

  return {
    lastSyncTime: calendarStore.get('lastSyncTime'),
    eventCount: Object.keys(mappings).length,
    syncEnabled: calendarStore.get('syncEnabled'),
  };
}

// Enable/disable calendar sync
export function setCalendarSyncEnabled(enabled: boolean): void {
  calendarStore.set('syncEnabled', enabled);
}

// Clear calendar sync data
export function clearCalendarSyncData(): void {
  calendarStore.clear();
}

// Check if sync is enabled
export function isCalendarSyncEnabled(): boolean {
  return calendarStore.get('syncEnabled');
}
