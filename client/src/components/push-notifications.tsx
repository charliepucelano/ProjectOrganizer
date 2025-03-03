import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      console.log('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw new Error('Service Worker registration failed');
    }
  }
  throw new Error('Service Worker not supported');
}

async function subscribeToPushNotifications(registration: ServiceWorkerRegistration) {
  try {
    console.log('Fetching VAPID key...');
    const response = await fetch('/api/push/vapidKey');
    const { vapidKey } = await response.json();
    console.log('VAPID key received');

    console.log('Subscribing to push notifications...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey
    });
    console.log('Push subscription created:', subscription);

    // Send the subscription to the server
    console.log('Sending subscription to server...');
    await apiRequest('POST', '/api/push/subscribe', {
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(
        subscription.getKey('p256dh')!
      ),
      auth: arrayBufferToBase64(
        subscription.getKey('auth')!
      )
    });
    console.log('Subscription saved on server');

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw new Error('Failed to subscribe to push notifications');
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary);
}

export default function PushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already subscribed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          console.log('Current push subscription:', subscription);
          setIsSubscribed(!!subscription);
          setIsLoading(false);
        });
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      const registration = await registerServiceWorker();
      await subscribeToPushNotifications(registration);
      setIsSubscribed(true);
      toast({
        title: 'Notifications Enabled',
        description: "You'll receive notifications for tasks due soon",
      });
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to enable notifications',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return null;

  return (
    <Button
      variant={isSubscribed ? "secondary" : "default"}
      className="w-full"
      onClick={handleSubscribe}
      disabled={isSubscribed}
    >
      <Bell className="w-4 h-4 mr-2" />
      {isSubscribed ? 'Notifications Enabled' : 'Enable Notifications'}
    </Button>
  );
}