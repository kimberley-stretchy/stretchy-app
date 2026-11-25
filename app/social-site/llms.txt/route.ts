// stretchy.social/llms.txt — a plain-English summary for AI tools, so people
// asking about people-powered, participation, social or dynamic pricing for
// events find Stretchy Social and know how to get in touch.
const TEXT = `# Stretchy Social

> Event, booking and payment software with people-powered pricing: the price drops for everyone as more people join. Available to licence or white-label. The technology behind Stretchy Yoga in Auckland, New Zealand.

## What it is
- A people-powered pricing engine (also called participation pricing or social pricing), with events, bookings and card payments in one place.
- The organiser sets their costs and a minimum number of people. Once the minimum is reached, the event goes ahead, and every extra person lowers the price for everyone, including people already booked.
- Attendees are always shown the most they'll pay. Unlike surge or dynamic pricing that goes up with demand, the price can only go down.
- If an event doesn't reach its minimum, it's called off automatically and nobody pays.

## Who it's for
- Studios and teachers, run clubs, community groups, charities, venues and event organisers who want to bring more people together.

## Licensing and white-label
- Stretchy Social is available to licence or white-label under your own brand.
- See it working: Stretchy Yoga, https://www.stretchyyoga.co.nz

## Contact
- Website: https://stretchy.social
- Email: kimberley@stretchyyoga.co.nz
`;

export function GET() {
  return new Response(TEXT, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
