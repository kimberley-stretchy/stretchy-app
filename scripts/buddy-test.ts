// Buddy me up: matching rules and the Say hello check. Run: npx tsx scripts/buddy-test.ts
import { groupBuddies, cleanHello } from "../lib/buddy";

let fails = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) fails++; };
const keep = <T,>(a: T[]) => a; // no shuffle, so results are predictable
const ppl = (n: number, solo = true) => Array.from({ length: n }, (_, i) => ({ userId: `${solo ? "s" : "m"}${i}`, solo }));
const sizes = (g: string[][]) => g.map((x) => x.length).join(",");

check("1 person: no group (gets the 'just you' email)", groupBuddies(ppl(1), keep).length === 0);
check("2 people: one pair", sizes(groupBuddies(ppl(2), keep)) === "2");
check("3 people: one group of three", sizes(groupBuddies(ppl(3), keep)) === "3");
check("4 people: two pairs", sizes(groupBuddies(ppl(4), keep)) === "2,2");
check("7 people: pairs and one three", sizes(groupBuddies(ppl(7), keep)) === "2,2,3");
const mixed = groupBuddies([...ppl(2, false), ...ppl(2, true)], keep);
check("solo people matched with each other first", mixed[0].every((u) => u.startsWith("s")) && mixed[1].every((u) => u.startsWith("m")));
const all = groupBuddies(ppl(9)).flat();
check("everyone in exactly one group (shuffled)", all.length === 9 && new Set(all).size === 9);

const ok = (v: string) => !("error" in cleanHello(v));
check("plain hello is fine", ok("Ask me about my sourdough disaster."));
check("empty is fine (optional)", ok("   "));
check("tidies spaces", (cleanHello("  hi   there ") as { hello: string }).hello === "hi there");
check("blocks a phone number", !ok("Text me 021 234 5678"));
check("blocks an email", !ok("me@example.com"));
check("blocks an @handle", !ok("Find me @kimbo"));
check("blocks a link", !ok("see www.mysite.com"));
check("blocks 'insta:'", !ok("insta: kimbo"));
check("allows a time or small number", ok("Into running 5km at 6am"));
check("blocks over 140 characters", !ok("a".repeat(141)));

console.log(fails ? `\n${fails} failed` : "\nAll passed");
process.exit(fails ? 1 : 0);
