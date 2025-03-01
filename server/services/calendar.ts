import { google } from 'googleapis';
import { Todo } from '@shared/schema';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/api/auth/google/callback'
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export async function createCalendarEvent(todo: Todo) {
  if (!todo.dueDate) return null;

  try {
    const event = {
      summary: todo.title,
      description: todo.description || '',
      start: {
        dateTime: new Date(todo.dueDate).toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(todo.dueDate).toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: true
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export function getAuthUrl() {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
}

export async function setCredentials(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}
