// stretchy.social — the forms behind the four buttons, and the optional
// "Help shape Stretchy Social" questions. One place for the option lists,
// the per-button copy and the checks, used by the page and the server alike.
// Source: the Claude Design handover (Stretchy Social.dc.html) and the MVP
// handover brief (Oct 2026).

export type LeadType = "waitlist" | "beta" | "talk" | "invest";
export const LEAD_TYPES: LeadType[] = ["waitlist", "invest", "talk", "beta"];

export const TYPES: Record<LeadType, {
  label: string; short: string; title: string; sub: string; cta: string; msgLabel: string;
  ink: string; bg: string; fg: string; btn: string; btnFg: string;
  thanksTitle: string; thanksAccent: string; thanksBody: string;
}> = {
  waitlist: { label: "Join the waitlist", short: "Waitlist", title: "Join the waitlist.", sub: "Hear about beta testing and early access.", cta: "Join the waitlist", msgLabel: "Anything you’d like us to know?", ink: "#8E2F8C", bg: "#FDB913", fg: "#16110F", btn: "#16110F", btnFg: "#F7F1EA",
    thanksTitle: "You’re on the list.", thanksAccent: "Thanks for joining us early.", thanksBody: "We’ll be in touch when beta testing and early access open up. A confirmation is on its way to your inbox." },
  invest: { label: "Invest in the movement", short: "Invest", title: "Back the next chapter.", sub: "Start a conversation about backing the next chapter.", cta: "Start the conversation", msgLabel: "Tell us a little about you", ink: "#0000F5", bg: "#0000F5", fg: "#F7F1EA", btn: "#F7F1EA", btnFg: "#16110F",
    thanksTitle: "Conversation started.", thanksAccent: "Thanks for believing in it.", thanksBody: "We’ll be in touch personally to find a time to talk." },
  talk: { label: "Partner & collab", short: "Partner & collab", title: "Let’s talk.", sub: "Explore a use case, licensing opportunity or partnership.", cta: "Start a chat", msgLabel: "What would you like to explore?", ink: "#B4500A", bg: "#E8650A", fg: "#16110F", btn: "#16110F", btnFg: "#F7F1EA",
    thanksTitle: "Chat started.", thanksAccent: "Kimberley will be in touch.", thanksBody: "We read every message personally. Expect a reply within a few working days." },
  beta: { label: "Beta test", short: "Beta test", title: "Put your hand up.", sub: "Help us learn what works in the real world.", cta: "Put my hand up", msgLabel: "How do your events run today?", ink: "#8E2F8C", bg: "#29A9E1", fg: "#16110F", btn: "#16110F", btnFg: "#F7F1EA",
    thanksTitle: "Hand up, noted.", thanksAccent: "Let’s test it together.", thanksBody: "Thanks for offering up your community. We’ll reach out to chat about what a real-world test could look like." },
};

export const GROUPS = ["Community or social club", "Run club or movement group", "Movement or wellbeing studio", "Charity or fundraiser", "Event organiser", "Private events", "Investor", "Other"];
export const COUNTRIES = ["New Zealand", "Australia", "United Kingdom", "Ireland", "United States", "Europe (other)", "Other"];
export const CURRENCY_FOR: Record<string, Currency> = { "New Zealand": "NZD", Australia: "AUD", "United Kingdom": "GBP", Ireland: "EUR", "Europe (other)": "EUR", "United States": "USD" };
export type Currency = "NZD" | "AUD" | "USD" | "GBP" | "EUR";
export const CURRENCIES: Currency[] = ["NZD", "AUD", "USD", "GBP", "EUR"];
export const SYMBOL: Record<Currency, string> = { NZD: "$", AUD: "$", USD: "$", GBP: "£", EUR: "€" };
export const SIZES = ["Under 15", "15–30", "30–60", "60–150", "150+"];
export const STARTS = ["Now", "Next 3 months", "Later"];
export const BRINGS = ["Tech", "Venue", "Community", "Brand", "Other"];
export const SPEND_KEYS = ["0", "lt50", "50-150", "150-400", "400+", "unsure"] as const;
export function spendLabel(key: string, cur: Currency): string {
  const s = SYMBOL[cur];
  return ({ "0": `${s}0`, lt50: `Under ${s}50`, "50-150": `${s}50–150`, "150-400": `${s}150–400`, "400+": `${s}400+`, unsure: "Not sure" } as Record<string, string>)[key] ?? key;
}

export type Step2Question = { k: string; t: string; o: string[]; multi?: boolean; skipFor?: LeadType };
export const STEP2_A: Step2Question[] = [
  { k: "stage", t: "Where are you at?", o: ["Established", "Starting up", "Pop-ups or one-offs", "Just exploring"] },
  { k: "group_size", t: "People per event", o: SIZES, skipFor: "beta" },
  { k: "frequency", t: "How often do you run events?", o: ["Weekly or more", "Monthly", "A few times a year", "One-off"] },
  { k: "access", t: "Who can come?", o: ["Open to anyone", "Members only", "A mix", "Not sure yet"] },
  { k: "pay_now", t: "How do people pay you now?", o: ["Membership or subscription", "Pay per event", "Class packs", "Free or donation", "Not sure yet"], multi: true },
  { k: "current_tools", t: "What do you use now?", o: ["Nothing / spreadsheets / bank transfer", "Eventbrite", "Humanitix", "Momence", "Mindbody", "ClassPass", "Website booking (Squarespace, Wix)", "DMs and group chats", "Other"], multi: true },
  { k: "currency", t: "Your currency", o: CURRENCIES },
  { k: "monthly_spend", t: "Monthly spend on those tools", o: [...SPEND_KEYS] },
  { k: "takes_cut", t: "Do they take a cut of each booking?", o: ["Yes", "No", "Not sure"] },
  { k: "integrations", t: "What would it need to connect to?", o: ["Stripe", "Xero", "Google Calendar", "Email tools (Mailchimp etc.)", "Instagram", "Your website", "WhatsApp", "Other"], multi: true },
];
export const STEP2_B: Step2Question[] = [
  { k: "chat_ok", t: "Up for a 20-minute chat?", o: ["Yes", "No"] },
  { k: "heard_from", t: "How did you hear about us?", o: ["Instagram", "A friend", "Stretchy Yoga", "Other"] },
];

export type Step1 = {
  type: LeadType; name: string; email: string; org?: string; region?: string; group?: string; country: string;
  size?: string; start?: string; brings?: string[]; about?: string; message?: string; optin?: boolean; hp?: string;
};

export function validateStep1(f: Pick<Step1, "name" | "email" | "country">): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name?.trim()) e.name = "Please add your name.";
  if (!f.email?.trim()) e.email = "We need an email to reply to.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "That email doesn’t look quite right.";
  if (!f.country) e.country = "Please choose a country.";
  return e;
}

/** Someone worth a call this week: happy to chat, and already spending 150+ a month. */
export function isHotLead(o: { chat_ok?: boolean | null; monthly_spend?: string | null }): boolean {
  return o.chat_ok === true && (o.monthly_spend === "150-400" || o.monthly_spend === "400+");
}
