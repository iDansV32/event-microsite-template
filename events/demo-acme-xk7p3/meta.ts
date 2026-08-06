import type { z } from "zod";
import type { Meta } from "@/lib/schemas";

export const meta = {
  slug: "demo-acme-xk7p3",
  templateVersion: "1.0.0",
  status: "draft",
  enabledSections: [
    "overview",
    "agenda",
    "hotel",
    "registration",
    "faq",
    "expensing",
    "feedback",
  ],
  retention: {
    pii: "90d",
    public: "forever",
  },
  rsvp: {
    supabaseTable: "rsvps",
  },
} satisfies z.input<typeof Meta>;
