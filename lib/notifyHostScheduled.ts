import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildIcsContent, googleCalendarUrl } from "@/lib/calendar";
import { sendPushToUser } from "@/lib/push-server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Notifies a teacher/GEM the moment they're assigned to a session — email
// (with a calendar file attached and a Google Calendar link) plus a push
// notification. Fire-and-forget, matching every other notification call
// site in this codebase: never throws, never blocks the caller.
export async function notifyHostScheduled({
  hostId,
  role,
  session,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: { title: string; startsAt: string; endsAt: string; locationName: string; locationAddress?: string | null };
}) {
  try {
    const admin = getAdmin();
    const { data: host } = await admin
      .from("hosts")
      .select("name, email, auth_user_id")
      .eq("id", hostId)
      .single();

    if (!host) return;

    const firstName = host.name?.split(" ")[0] ?? "there";
    const roleLabel = role === "teacher" ? "teaching" : "GEM-ing";
    const startDate = new Date(session.startsAt);
    const dateStr =
      startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }) +
      " at " + startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true });
    const location = session.locationAddress || session.locationName;

    const calendarEvent = {
      title: session.title,
      startISO: session.startsAt,
      endISO: session.endsAt,
      location,
      description: `You're ${roleLabel} this one for Stretchy.`,
    };
    const calUrl = googleCalendarUrl(calendarEvent);
    const icsContent = buildIcsContent(calendarEvent);

    if (host.email && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: "Stretchy HQ <hello@stretchy.social>",
          to: host.email,
          subject: `You're scheduled: ${session.title}`,
          text: `Hi ${firstName},\n\nYou're down for ${roleLabel} ${session.title} — ${dateStr}, ${session.locationName}.\n\nAdd it to your calendar: ${calUrl}\n(or open the attached .ics file)\n\nStretchy HQ`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#F7F0E8;padding:32px;border-radius:16px;">
              <p style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;letter-spacing:.14em;color:#902F8A;margin:0 0 12px;">STRETCHY HQ · YOU'RE SCHEDULED</p>
              <h1 style="font-size:26px;font-weight:900;color:#14110F;margin:0 0 12px;">${session.title}</h1>
              <p style="color:rgba(20,17,15,.7);font-size:15px;margin:0 0 20px;">Hi ${firstName} — you're down for ${roleLabel} this one. ${dateStr} at ${session.locationName}.</p>
              <a href="${calUrl}" style="display:inline-block;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;">Add to Google Calendar →</a>
              <p style="font-size:12px;color:rgba(20,17,15,.5);margin:20px 0 0;">Using Apple Calendar or Outlook? Open the attached file instead.</p>
            </div>
          `,
          attachments: [
            {
              filename: `${session.title.replace(/\s+/g, "-").toLowerCase()}.ics`,
              content: Buffer.from(icsContent).toString("base64"),
            },
          ],
        })
        .catch((e) => console.error("Session-assigned email error:", e));
    }

    if (host.auth_user_id) {
      sendPushToUser(host.auth_user_id, {
        title: "You're scheduled",
        body: `${session.title} — ${dateStr}`,
        url: "/host/home",
      }).catch((e) => console.error("Session-assigned push error:", e));
    }
  } catch (e) {
    console.error("notifyHostScheduled error:", e);
  }
}
