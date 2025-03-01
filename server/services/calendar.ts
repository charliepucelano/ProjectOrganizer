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
    console.log('Creating calendar event for todo:', todo.title);
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
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    if (error.code === 401) {
      throw new Error('Calendar authorization expired. Please reconnect your Google Calendar.');
    }
    throw new Error('Failed to create calendar event. Please try again later.');
  }
}

export function getAuthUrl() {
  console.log('Generating Google Calendar auth URL');
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    include_granted_scopes: true
  });
}

export async function setCredentials(code: string) {
  try {
    console.log('Setting Google Calendar credentials with auth code');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Successfully obtained Google Calendar tokens');
    return tokens;
  } catch (error: any) {
    console.error('Error setting credentials:', error);
    if (error.response?.data?.error === 'invalid_grant') {
      throw new Error('Invalid authorization code. Please try connecting again.');
    }
    throw new Error('Failed to connect to Google Calendar. Please check your permissions and try again.');
  }
}