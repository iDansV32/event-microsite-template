import type { z } from "zod";
import type { Feedback } from "@/lib/schemas";

export const feedback = {
  // Replace with your own Tally form id (the part after tally.so/r/).
  // Configure two hidden fields on that form: `event`, `respondent`.
  tallyFormId: "REPLACEME",
  isOpen: true,
  heading: "Tell us how it went",
  intro:
    "A few minutes of your honest take — what worked, what didn’t, and what we should do differently next time. It shapes the next one more than you’d think.",
  outro:
    "Thanks to everyone who shared their thoughts — it genuinely shapes the next one.",
  iframeHeightPx: 1100,
} satisfies z.input<typeof Feedback>;
