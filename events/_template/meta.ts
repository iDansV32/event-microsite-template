import type { z } from "zod";
import type { Meta } from "@/lib/schemas";

export const meta = {
  slug: "template-placeholder",
  templateVersion: "1.0.0",
  status: "draft",
  // Narrowed to sections that do not require a separate content file.
  // Enable "agenda" / "faq" / "expensing" here when you add the
  // corresponding events/<slug>/*.ts module (and export it from index.ts).
  enabledSections: ["overview", "hotel", "registration"],
  retention: {
    pii: "90d",
    public: "forever",
  },
  rsvp: {
    supabaseTable: "rsvps",
  },
} satisfies z.input<typeof Meta>;
