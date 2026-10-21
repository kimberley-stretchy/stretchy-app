// stretchy.social/research — the market research survey (Oct 2026). One list
// drives the page, the API's checks, the HQ tallies and the CSV, so a question
// changed here changes everywhere. Answers are saved as one JSON object keyed
// by question; "Other" text goes in `${k}_other`.

export const OTHER = "Other";

export type ResearchQuestion = {
  k: string;
  n: number;
  q: string;
  type: "multi" | "one" | "text";
  options?: string[];
  /** Multi-pick limit ("Select up to three"). */
  max?: number;
  /** Adds an "Other" chip with a text box. */
  other?: boolean;
  /** Small line under the question. */
  hint?: string;
  placeholder?: string;
};

export type ResearchSection = { title: string; intro?: string[]; questions: ResearchQuestion[] };

export const RESEARCH_SECTIONS: ResearchSection[] = [
  {
    title: "A little about you",
    questions: [
      { k: "org_type", n: 1, q: "Which best describes the organisation, community or activity you’re involved in?", type: "multi", hint: "Select all that apply.", other: true, options: [
        "Charity or not-for-profit", "Fundraising event or initiative", "Grassroots community group or club", "Fitness or movement community (e.g. run club, tennis, yoga)",
        "Social community", "Arts, design or cultural community", "Education community", "Wellness studio or venue",
        "Independent teacher, facilitator or guide", "Private event or workshop",
      ] },
      { k: "role", n: 2, q: "What’s your role?", type: "one", other: true, options: [
        "Founder / owner", "Organiser / event host", "Teacher / facilitator / coach", "Community or marketing lead", "Venue or studio owner", "Volunteer",
      ] },
      { k: "based", n: 3, q: "Where are you based?", type: "one", options: ["New Zealand", "Australia", "Both", "Somewhere else"], other: false },
    ],
  },
  {
    title: "How you bring people together",
    questions: [
      { k: "gatherings", n: 4, q: "What kinds of gatherings do you organise?", type: "multi", hint: "Select all that apply.", other: true, options: [
        "One-off event or pop-up", "Regular sessions", "Monthly gatherings", "Multi-session workshops or programmes", "Teacher training or professional development",
        "Fundraising events", "Private or ticketed events", "We don’t organise events yet, but we’re exploring it",
      ] },
      { k: "frequency", n: 5, q: "How often do you run them?", type: "one", options: [
        "Less than once a month", "Monthly", "Fortnightly", "Weekly", "Several times a week", "Seasonally or in occasional bursts", "It varies",
      ] },
      { k: "attendance", n: 6, q: "Approximately how many people usually attend each gathering?", type: "one", options: [
        "Fewer than 10", "10–20", "21–40", "41–75", "76–150", "More than 150", "It varies / we’re just getting started",
      ] },
      { k: "booking_now", n: 7, q: "How do you currently manage bookings and payments?", type: "multi", hint: "Select all that apply.", other: true, options: [
        "Bank transfer", "Cash or pay-on-the-day", "Stripe payment links", "Eventbrite or Humanitix", "Momence, Mindbody or another booking platform",
        "Squarespace, Wix or another website booking tool", "ClassPass", "Manual bookings through Instagram, email or DMs", "Free bookings — no payment required",
        "We don’t currently take bookings",
      ] },
      { k: "challenges", n: 8, q: "What are the biggest challenges when organising your sessions or events?", type: "multi", max: 3, hint: "Select up to three.", other: true, options: [
        "Getting enough people to commit", "Covering venue, teacher, facilitator or operating costs", "Knowing whether an event is financially viable before confirming it",
        "Keeping activities affordable and accessible", "Managing cancellations and no-shows", "Booking, payment and refund administration",
        "Finding a suitable booking platform", "Platform fees are too high", "Building community and encouraging people to bring others",
        "Fundraising or meeting a shared financial goal", "We don’t have any major challenges at the moment",
      ] },
      { k: "go_ahead", n: 9, q: "How do you currently decide whether an event has enough people to go ahead?", type: "one", other: true, options: [
        "We have a minimum number and cancel if we don’t reach it", "We run it regardless of attendance", "We need a certain amount of revenue to cover costs",
        "We rely on pre-sales, deposits or sponsorship", "We decide case by case", "We don’t currently have a process",
      ] },
    ],
  },
  {
    title: "Your priorities",
    questions: [
      { k: "matters", n: 10, q: "What matters most when you’re organising an event, session or gathering?", type: "multi", max: 2, hint: "Select up to two.", other: true, options: [
        "Creating a great experience for everyone who takes part", "Making the experience as accessible and affordable as possible",
        "Covering our costs, with a fair amount of revenue left over", "Growing attendance and bringing more people into our community",
        "Generating as much revenue or profit as possible", "Raising as much money as possible for a cause", "Building a sustainable, ongoing programme or business",
        "Creating social impact or a positive community outcome", "Testing new ideas without taking on too much financial risk",
      ] },
      { k: "top_priority", n: 11, q: "If you had to choose, which is your biggest priority?", type: "one", hint: "Select one.", other: true, options: [
        "The experience and impact we create", "Making it accessible to as many people as possible", "Covering costs and making a sustainable return",
        "Maximising revenue or profit", "Growing our community and attendance",
      ] },
    ],
  },
  {
    title: "What if pricing worked differently?",
    intro: [
      "People-powered pricing is the idea behind Stretchy Social. Instead of charging a fixed price per person from the outset, an organiser sets a shared goal or attendance threshold. As more people join, the price can improve for everyone.",
      "For example, a yoga class might need a certain amount of revenue to cover the teacher and venue. As more people join, that cost can be shared across the group. A community event might work towards a minimum attendance number or a shared fundraising goal.",
    ],
    questions: [
      { k: "appeal", n: 12, q: "How appealing is this idea for the gatherings you organise?", type: "one", options: [
        "Very appealing", "Somewhat appealing", "Not sure — I’d need to understand how it works", "Not very appealing", "Not relevant to us",
      ] },
      { k: "useful_for", n: 13, q: "Where could this model be useful for you?", type: "multi", hint: "Select all that apply.", other: true, options: [
        "Making sessions or events more affordable", "Getting more people to commit and attend", "Reaching a minimum number before confirming an event",
        "Sharing fixed costs across a group", "Helping fundraise for a cause", "Encouraging people to invite friends or bring others along",
        "Testing a new event before committing to larger costs", "Making workshops or training more accessible", "I don’t see a clear use for it yet",
      ] },
      { k: "need_to_trust", n: 14, q: "What would you need to understand or trust before trying it?", type: "text", hint: "Optional short answer." },
      { k: "concerns", n: 15, q: "What concerns, if any, would you have?", type: "multi", hint: "Select all that apply.", other: true, options: [
        "The pricing mechanics might be confusing", "The final price might be unpredictable", "It could be difficult to explain to participants",
        "It might make budgeting harder for organisers", "Payment, cancellation or refund rules could be complicated", "It might not suit the way our events operate",
        "I don’t have any concerns",
      ] },
    ],
  },
  {
    title: "How would you use it?",
    intro: ["Stretchy is exploring a booking and payment platform that organisations could use on their own website, with their own branding, rather than having to move their community to a new marketplace."],
    questions: [
      { k: "setup", n: 16, q: "Which booking setup would work best for your organisation?", type: "one", options: [
        "Embedded booking widget: booking and pricing sit directly within our existing website and brand.",
        "Our own branded booking page: a separate booking page with our logo, colours and identity, which we can link to from our website or social channels.",
        "Fully white-labelled platform: a more integrated experience under our own brand, potentially including a custom domain, deeper website integration and customised functionality.",
        "A standalone Stretchy booking page: we use a Stretchy-hosted page that we can link to from our website or social channels.",
        "A shared marketplace: people discover and book events from different organisations through one central platform.",
        "Not sure — I’d like to see the options.",
      ] },
      { k: "pay_how", n: 17, q: "How would you prefer to pay for a platform like this?", type: "one", options: [
        "A small flat fee each time we run a session or event", "A monthly subscription for regular use", "A combination of a monthly subscription and a lower fee per session",
        "A one-off setup fee", "Free to use, with another way to fund the platform", "We wouldn’t pay for this", "Not sure",
      ] },
      { k: "per_session_fee", n: 18, q: "If a one-off session cost $5–$10 to run through Stretchy, excluding payment-processing fees, how would that feel?", type: "one", options: [
        "Very affordable", "Reasonable", "A little expensive", "Too expensive", "It depends on the event or the value provided", "We would only consider a subscription", "Not sure",
      ] },
      { k: "monthly", n: 19, q: "What would you expect to pay for ongoing use?", type: "one", options: [
        "Under $20/month", "$20–$39/month", "$40–$79/month", "$80–$149/month", "$150+/month for a more customised or white-labelled setup",
        "I’d rather pay per event", "We wouldn’t pay for this", "Not sure",
      ] },
      { k: "try_it", n: 20, q: "What would make you most likely to try it?", type: "text", hint: "Optional short answer." },
    ],
  },
  {
    title: "What happens next?",
    questions: [
      { k: "interest", n: 21, q: "Which best describes your interest?", type: "one", options: [
        "I’d like to take part in an early-stage pilot", "I’d be interested in beta testing the platform", "I’d like to have a conversation about how it could work for us",
        "I’d consider using it once it’s ready", "I’d just like to keep up with progress", "I’m interested in the idea, but it’s not relevant to us right now",
      ] },
      { k: "anything_else", n: 22, q: "Anything else you’d like us to know?", type: "text", hint: "Optional open response." },
    ],
  },
];

export const RESEARCH_QUESTIONS = RESEARCH_SECTIONS.flatMap((s) => s.questions);

// "Somewhere else" on Q3 has its own text box too.
export const hasOtherBox = (q: ResearchQuestion) => q.other || (q.k === "based");
export const otherLabel = (q: ResearchQuestion) => (q.k === "based" ? "Somewhere else" : OTHER);

export type ResearchAnswers = Record<string, string | string[]>;

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");

/** Keep only real questions and allowed answers (server side). */
export function cleanResearch(raw: unknown): ResearchAnswers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: ResearchAnswers = {};
  for (const q of RESEARCH_QUESTIONS) {
    const v = r[q.k];
    if (q.type === "text") {
      const t = text(v, 2000);
      if (t) out[q.k] = t;
      continue;
    }
    const allowed = [...(q.options ?? []), ...(q.other ? [OTHER] : [])];
    if (q.type === "multi") {
      let list = Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string" && allowed.includes(x)))) : [];
      if (q.max) list = list.slice(0, q.max);
      if (list.length) out[q.k] = list;
    } else if (typeof v === "string" && allowed.includes(v)) {
      out[q.k] = v;
    }
    const other = text(r[`${q.k}_other`], 300);
    const picked = out[q.k];
    const otherPicked = Array.isArray(picked) ? picked.includes(otherLabel(q)) : picked === otherLabel(q);
    if (hasOtherBox(q) && other && otherPicked) out[`${q.k}_other`] = other;
  }
  return out;
}
