import type { z } from "zod";
import type { Faq } from "@/lib/schemas";

export const faq = {
  items: [
    {
      q: "Is attendance mandatory?",
      a: "Yes \u2014 Offsite 2026 is required for all team members. If you have a conflict, speak with your manager as soon as possible.",
    },
    {
      q: "When does registration open?",
      a: "Registration is now open. The final deadline is TBD. You\u2019ll get an email when anything changes.",
    },
    {
      q: "How does the hotel work?",
      a: "The events team manages a room block at Palma Verde Resort. Register to be added to the rooming list \u2014 you\u2019ll get a confirmation directly from the hotel.",
    },
    {
      q: "How do I book my flights?",
      a: "Flight booking will be coordinated by the events team. Instructions are coming soon via Slack.",
    },
    {
      q: "What if I need to cancel?",
      a: "Let the events team know as soon as possible in #offsite-2026. Flight and hotel changes may have cost implications \u2014 see the Expensing page.",
    },
    {
      q: "Can I bring a guest?",
      a: "Plus-ones are welcome but self-pay at $130/person/day. Guest flights are also your responsibility. You can also extend your stay on your own dime at $99/day (employees) or $130/day (plus-ones).",
    },
    {
      q: "What if I have a dietary need not listed?",
      a: "Note it during registration or reach out in #offsite-2026. We\u2019ll work with the venue to accommodate.",
    },
    {
      q: "Will sessions be recorded?",
      a: "Sessions will not be recorded. The offsite is designed to be an in-person, interactive experience \u2014 we want everyone present in the room.",
    },
    {
      q: "What should I pack?",
      a: "Resort casual. Swimwear, sandals, light breathable clothing, sunscreen, and a light layer for air-conditioned spaces. One smart-casual outfit for a nicer dinner. Don\u2019t forget your passport.",
    },
    {
      q: "Who do I contact with questions?",
      a: "Post in #offsite-2026 on Slack \u2014 that\u2019s the fastest way to get a response from the events team.",
    },
  ],
} satisfies z.input<typeof Faq>;
