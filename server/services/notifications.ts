import webpush from 'web-push';
import { Todo, PushSubscription } from '@shared/schema';
import { storage } from '../storage';

// Ensure VAPID keys are URL-safe Base64 without padding
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.replace(/=/g, '') || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.replace(/=/g, '') || '';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error("ERROR: Missing required VAPID keys");
} else {
  console.log("Configuring web-push with VAPID keys");
  webpush.setVapidDetails(
    'mailto:example@yourdomain.org',
    vapidPublicKey,
    vapidPrivateKey
  );
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

export async function checkAndNotifyDueTasks() {
  const todos = await storage.getTodos();
  const now = new Date();
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  // Find tasks that are either overdue or due within 5 days
  const dueTasks = todos.filter(todo => {
    if (!todo.dueDate || todo.completed) return false;
    const dueDate = new Date(todo.dueDate);
    return dueDate <= fiveDaysFromNow;
  });

  if (dueTasks.length === 0) return;

  // Get all users (in a real app, you'd want to optimize this)
  const users = Array.from(await storage.getUsers());

  for (const user of users) {
    const subscriptions = await storage.getPushSubscriptions(user.id);

    for (const subscription of subscriptions) {
      // Only send one notification per day per subscription
      if (subscription.lastNotified) {
        const lastNotified = new Date(subscription.lastNotified);
        if (now.getTime() - lastNotified.getTime() < 24 * 60 * 60 * 1000) {
          continue;
        }
      }

      // Send notification for each due task
      for (const task of dueTasks) {
        await sendTaskNotification(subscription, task);
      }
    }
  }
}