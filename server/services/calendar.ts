import { google } from "googleapis";
import { Todo } from "@shared/schema";

// Hardcode the exact redirect URI to ensure consistency
const REDIRECT_URI = 'https://913ab86d-d70d-412c-9bf2-4971d8e3a307-00-3r1iwxlz01r7b.janeway.replit.dev/api/auth/google/callback';

// Log OAuth2 client configuration (without exposing secrets)
console.log(
  "Initializing OAuth2 client with redirect URI:",
  REDIRECT_URI
);

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("ERROR: Missing required Google OAuth credentials");
} else {
  console.log("Google OAuth credentials found");
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

export function getAuthUrl() {
  console.log("Generating Google Calendar auth URL");
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  console.log('OAuth2 client configuration:', {
    redirectUri: REDIRECT_URI,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
  });

  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      include_granted_scopes: true,
      redirect_uri: REDIRECT_URI // Explicitly set the redirect URI
    });

    console.log("Generated auth URL:", url);
    return url;
  } catch (error) {
    console.error("Error generating auth URL:", error);
    throw new Error("Failed to generate authorization URL");
  }
}

export async function setCredentials(code: string) {
  try {
    console.log('Setting Google Calendar credentials with auth code');
    console.log('OAuth2 client configuration:', {
      redirectUri: REDIRECT_URI,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });

    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: REDIRECT_URI // Explicitly set the redirect URI for token exchange
    });

    console.log('Token exchange successful, received tokens:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      expiry_date: tokens.expiry_date,
      scope: tokens.scope
    });

    oauth2Client.setCredentials(tokens);
    console.log("Successfully set credentials in oauth2Client");
    return tokens;
  } catch (error: any) {
    console.error("Error setting credentials:", error);
    console.error("Error details:", {
      response: error.response?.data,
      status: error.response?.status,
      message: error.message,
    });

    if (error.response?.data?.error === "invalid_grant") {
      throw new Error(
        "Invalid authorization code. Please try connecting again.",
      );
    }
    throw new Error(
      "Failed to connect to Google Calendar. Please check your permissions and try again.",
    );
  }
}

function formatEventDescription(todo: Todo) {
  const parts = [
    todo.description || '',
    `Category: ${todo.category}`,
  ];

  if (todo.hasAssociatedExpense && todo.estimatedAmount) {
    parts.push(`Estimated Amount: $${todo.estimatedAmount.toFixed(2)}`);
  }

  return parts.filter(Boolean).join('\n\n');
}

export async function createCalendarEvent(todo: Todo) {
  if (!todo.dueDate) return null;

  try {
    console.log("Creating calendar event for todo:", todo.title);
    const event = {
      summary: `[${todo.category}] ${todo.title}`,
      description: formatEventDescription(todo),
      start: {
        dateTime: new Date(todo.dueDate).toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(todo.dueDate).toISOString(),
        timeZone: "UTC",
      },
      reminders: {
        useDefault: true,
      },
      // Add colorId based on priority (7 is red for high priority)
      colorId: todo.priority ? "7" : undefined,
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    if (error.code === 401) {
      throw new Error(
        "Calendar authorization expired. Please reconnect your Google Calendar.",
      );
    }
    throw new Error("Failed to create calendar event. Please try again later.");
  }
}

// New function to sync all open tasks with due dates
export async function syncAllTasks(todos: Todo[]) {
  const openTodosWithDueDate = todos.filter(todo => 
    !todo.completed && todo.dueDate
  );

  console.log(`Syncing ${openTodosWithDueDate.length} tasks to Google Calendar`);

  const results = await Promise.allSettled(
    openTodosWithDueDate.map(createCalendarEvent)
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Sync complete. Successfully synced: ${successful}, Failed: ${failed}`);

  if (failed > 0) {
    throw new Error(`Failed to sync ${failed} tasks to Google Calendar`);
  }

  return { successful, failed };
}