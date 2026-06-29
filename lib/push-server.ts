import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:kimberley@stretchyyoga.co.nz",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Send a push notification to a single user by their auth user_id
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; requireInteraction?: boolean }
) {
  const admin = getAdmin();
  const { data: sub } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .single();

  if (!sub?.endpoint) return;

  await sendPush(sub, payload);
}

// Send a push notification to multiple users at once
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string; requireInteraction?: boolean }
) {
  if (!userIds.length) return;

  const admin = getAdmin();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs?.length) return;

  await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; requireInteraction?: boolean }
) {
  configureWebPush();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 86400 }
    );
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    if (e?.statusCode === 410 || e?.statusCode === 404) {
      // Subscription expired — remove it
      const admin = getAdmin();
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    } else {
      console.error("Push send error:", err);
    }
  }
}
