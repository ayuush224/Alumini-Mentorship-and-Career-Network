import Pusher from "pusher";

let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (pusherServerInstance) {
    return pusherServerInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

  if (!appId || !key || !secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Pusher Server] PUSHER_APP_ID, PUSHER_KEY, or PUSHER_SECRET is not configured. Real-time events will be logged locally."
      );
    }
    return null;
  }

  pusherServerInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherServerInstance;
}

export async function broadcastMessage(
  mentorshipId: string,
  event: string,
  data: unknown
): Promise<boolean> {
  const server = getPusherServer();
  const channel = `private-chat-${mentorshipId}`;

  if (!server) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Pusher Mock Broadcast] Channel: ${channel}, Event: ${event}`, data);
    }
    return false;
  }

  try {
    await server.trigger(channel, event, data);
    return true;
  } catch (err) {
    console.error(`[Pusher Server Error] Failed to trigger event on ${channel}:`, err);
    return false;
  }
}
