import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildIcsContent, googleCalendarUrl } from "@/lib/calendar";
import { sendPushToUser } from "@/lib/push-server";
import { REPLY_TO, page, box, label, button, h1, hey, msg, row } from "@/lib/stretchy-email";

const HQ_FROM = "Stretchy HQ <hello@stretchy.social>";
const HQ_EMAIL = "kimberley@stretchyyoga.co.nz";

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function fmtDate(startsAt: string): string {
  const d = new Date(startsAt);
  return (
    d.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    d.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
  );
}

// Notifies a teacher/GEM the moment they're assigned to a session — email (with
// a calendar file + Google Calendar link) plus a push. Fire-and-forget.
export async function notifyHostScheduled({
  hostId,
  role,
  session,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: {
    title: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
    locationAddress?: string | null;
    style?: string | null;
    socialStretchVenue?: string | null;
    venueHandle?: string | null;
    socialVenueHandle?: string | null;
  };
}) {
  try {
    const admin = getAdmin();
    const { data: host } = await admin.from("hosts").select("name, email, auth_user_id").eq("id", hostId).single();
    if (!host) return;

    const firstName = host.name?.split(" ")[0] ?? "there";
    const roleLabel = role === "teacher" ? "teaching" : "GEM-ing";
    const dateStr = fmtDate(session.startsAt);
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
      const html = page("blue", (sc) => `
        ${label(sc, "Stretchy HQ · You're scheduled")}
        ${h1(sc, "You're scheduled. 🗓")}
        ${hey(sc, firstName)}
        ${msg(sc, `You're down for ${roleLabel} this one.`)}
        ${box(sc, `${label(sc, "The session")}${row(sc, `<strong>${session.title}</strong>`)}${row(sc, `🗓 ${dateStr}`)}${row(sc, `📍 ${session.locationName}${session.venueHandle ? ` · ${session.venueHandle}` : ""}`)}${session.style ? row(sc, `🧘 ${session.style}`) : ""}${session.socialStretchVenue ? row(sc, `🌞 Social Stretch after at ${session.socialStretchVenue}${session.socialVenueHandle ? ` · ${session.socialVenueHandle}` : ""}`) : ""}`)}
        ${button(sc, calUrl, "Add to Google Calendar →")}
        ${msg(sc, "Using Apple Calendar or Outlook? Open the attached file instead.")}
        ${msg(sc, "Cheers,<br>Stretchy")}
      `);
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: HQ_FROM,
          to: host.email,
          bcc: HQ_EMAIL,
          reply_to: REPLY_TO,
          subject: `You're scheduled: ${session.title}`,
          html,
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

// Notifies a teacher/GEM when their session is cancelled. Skips the HQ
// placeholder host (unassigned sessions default to Kimberley's record).
export async function notifyHostCancelled({
  hostId,
  role,
  session,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: { title: string; startsAt: string; locationName: string };
}) {
  try {
    const admin = getAdmin();
    const { data: host } = await admin.from("hosts").select("name, email, auth_user_id").eq("id", hostId).single();
    if (!host || host.email === HQ_EMAIL) return;

    const firstName = host.name?.split(" ")[0] ?? "there";
    const roleLabel = role === "teacher" ? "teaching" : "GEM-ing";
    const dateStr = fmtDate(session.startsAt);

    if (host.email && process.env.RESEND_API_KEY) {
      const html = page("cream", (sc) => `
        ${label(sc, "Stretchy HQ · Cancelled")}
        ${h1(sc, "This one's off. 💛")}
        ${hey(sc, firstName)}
        ${msg(sc, `Heads up — this one's been cancelled. You were ${roleLabel} it. Nothing you need to do — just remove it from your calendar.`)}
        ${box(sc, `${row(sc, `<strong>${session.title}</strong>`)}${row(sc, `🗓 ${dateStr}`)}${row(sc, `📍 ${session.locationName}`)}`)}
        ${msg(sc, "Cheers,<br>Stretchy")}
      `, { highlight: false });
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({ from: HQ_FROM, to: host.email, bcc: HQ_EMAIL, reply_to: REPLY_TO, subject: `Cancelled: ${session.title}`, html })
        .catch((e) => console.error("Session-cancelled email error:", e));
    }

    if (host.auth_user_id) {
      sendPushToUser(host.auth_user_id, {
        title: "Session cancelled",
        body: `${session.title} — ${dateStr} — no longer happening`,
        url: "/host/home",
      }).catch((e) => console.error("Session-cancelled push error:", e));
    }
  } catch (e) {
    console.error("notifyHostCancelled error:", e);
  }
}
