import webpush from 'web-push';
import { Todo, PushSubscription } from '@shared/schema';
import { storage } from '../storage';

// Configure web-push with VAPID keys
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error("ERROR: Missing required VAPID keys for push notifications");
} else {
  try {
    webpush.setVapidDetails(
      'mailto:example@yourdomain.org',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log("Web Push configured successfully with VAPID keys");
  } catch (error) {
    console.error("Failed to configure web-push:", error);
  }
}

export async function sendTaskNotification(
  subscription: PushSubscription,
  todo: Todo
) {
  try {
    console.log(`Attempting to send notification for task "${todo.title}" to subscription ${subscription.id}`);

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
    console.log(`Successfully sent notification for task "${todo.title}"`);
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    console.error('Subscription details:', {
      endpoint: subscription.endpoint,
      hasP256dh: !!subscription.p256dh,
      hasAuth: !!subscription.auth
    });

    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      console.log('Subscription is no longer valid:', subscription.endpoint);
    }
  }
}

// Function to check and send notifications for upcoming tasks
export async function checkAndNotifyTasks() {
  try {
    const todos = await storage.getTodos();
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Find tasks that are either overdue or due within 5 days
    const dueTasks = todos.filter(todo => {
      if (!todo.dueDate || todo.completed) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate <= fiveDaysFromNow;
    });

    if (dueTasks.length === 0) {
      console.log('No tasks due within 5 days');
      return;
    }

    console.log(`Found ${dueTasks.length} tasks to notify about`);

    // Get all users and their subscriptions
    const users = await storage.getUsers();

    for (const user of users) {
      const subscriptions = await storage.getPushSubscriptions(user.id);

      for (const subscription of subscriptions) {
        // Only send notifications if haven't notified in last 24 hours
        if (subscription.lastNotified) {
          const lastNotified = new Date(subscription.lastNotified);
          if (now.getTime() - lastNotified.getTime() < 24 * 60 * 60 * 1000) {
            console.log(`Skipping notifications for subscription ${subscription.id} - already notified today`);
            continue;
          }
        }

        // Send notifications for each due task
        for (const task of dueTasks) {
          await sendTaskNotification(subscription, task);
        }
      }
    }
  } catch (error) {
    console.error('Error checking and sending notifications:', error);
  }
}