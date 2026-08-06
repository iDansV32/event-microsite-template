import type { z } from "zod";
import type { EventContent } from "@/lib/schemas";

export const content = {
  brand: {
    client: "Client Name",
    shortName: "Client Offsite 2026",
    longName: "Client Company Offsite 2026",
    tagline: "A short, inviting sentence about the offsite.",
  },
  dates: {
    startISO: "2026-01-01T15:00:00-05:00",
    endISO: "2026-01-04T12:00:00-05:00",
    display: "January 1–4, 2026",
    displayShort: "Jan 1–4",
  },
  venue: {
    name: "Venue Name",
    address: "Street Address, City, Country",
    city: "City, Country",
  },
  registration: {
    isOpen: false,
  },
} satisfies z.input<typeof EventContent>;
