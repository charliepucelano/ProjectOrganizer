import webpush from 'web-push';
import { Todo, PushSubscription } from '@shared/schema';
import { storage } from '../storage';

// Log OAuth2 client configuration (without exposing secrets)
console.log("Configuring web-push with VAPID keys");

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("ERROR: Missing required Google OAuth credentials");
} else {
  console.log("Google OAuth credentials found");
}

export async function sendTaskNotification(
  subscription: PushSubscription,
  todo: Todo
) {
  try {
    const payload = JSON.stringify({
      title: 'Task Reminder',
      body: `Task "${todo.title}" is ${todo.dueDate && new Date(todo.dueDate) < new Date() ? 'overdue' : 'due soon'}!`,
      url: '/',
    });

    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      }
    }, payload);

    await storage.updateLastNotified(subscription.id, new Date());
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      console.log('Subscription is no longer valid:', subscription.endpoint);
    }
  }
}