import PusherClient from "pusher-js";

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (pusherClientInstance) {
    return pusherClientInstance;
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

  if (!key) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Pusher Client] NEXT_PUBLIC_PUSHER_KEY is not configured. WebSocket subscription will be mocked."
      );
    }
    return null;
  }

  pusherClientInstance = new PusherClient(key, {
    cluster,
    authEndpoint: "/api/pusher/auth",
    auth: {
      headers: {
        // CSRF or custom auth headers if needed
      },
    },
  });

  return pusherClientInstance;
}
