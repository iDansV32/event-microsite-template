import type { z } from "zod";
import type { EventContent } from "@/lib/schemas";

export const content = {
  brand: {
    client: "Acme",
    shortName: "Acme Offsite 2026",
    longName: "Acme Company Retreat 2026",
    tagline:
      "A few days in paradise together — aligning, energizing, and setting the course for the year ahead.",
  },
  dates: {
    startISO: "2026-06-01T15:00:00-04:00",
    endISO: "2026-06-04T12:00:00-04:00",
    display: "June 1–4, 2026",
    displayShort: "June 1–4",
  },
  venue: {
    name: "Palma Verde Resort",
    address: "Costa Azul, Isla Verde",
    city: "Isla Verde",
    cityShort: "Isla Verde",
    neighborhood: "Costa Azul Beach",
    url: "https://example.com/palma-verde-resort",
  },
  airport: {
    code: "IVD",
    name: "Isla Verde International Airport",
    detail: "~20 min from resort · Group transfers TBD",
  },
  registration: {
    isOpen: true,
  },
  rates: {
    extensionEmployee: 99,
    extensionPlusOne: 130,
    plusOne: 130,
  },
  contact: {
    slackChannel: "#offsite-2026",
    supportEmail: "events@example.com",
  },
  overview: {
    headline: { main: "Acme", emphasis: "\u201926." },
    issueLabel: "ISSUE NO. 01 \u00b7 SPRING 2026",
    mastheadStats: [
      { eyebrow: "Attendees", value: "~20", sub: "Full team + CSL" },
      { eyebrow: "Style", value: "All-inclusive", sub: "Resort \u00b7 beachfront" },
    ],
    countdownHeading: {
      before: "Until we\u2019re ",
      emphasis: "all",
      after: " on the beach.",
    },
    heroCaption: {
      figLabel: "Fig. 01",
      text: "\u2014 A welcome view from the resort.",
    },
    mosaicCaption: "FIG. 02\u201404 \u00b7 PALMA VERDE RESORT \u00b7 REFERENCE FRAMES",
    hero: {
      src: "/images/hotel/pool-1.jpg",
      alt: "Palma Verde Resort \u2014 pool view",
      label: "palma verde \u00b7 4:5",
    },
    mosaic: [
      {
        src: "/images/hotel/exterior-4.jpg",
        alt: "Resort grounds",
        label: "grounds \u00b7 3:4",
      },
      {
        src: "/images/hotel/beach-1.jpg",
        alt: "Costa Azul Beach",
        label: "costa azul beach \u00b7 16:10",
      },
      {
        src: "/images/hotel/pool-cabanas.jpg",
        alt: "Pool cabanas",
        label: "pool cabanas \u00b7 3:4",
      },
    ],
    arrivalDetail: "Check-in at 3 PM \u00b7 Welcome reception at 6 PM.",
    departureDetail: "Closing lunch \u00b7 Safe travels home.",
    program: {
      intro:
        "Three and a half days of big ideas, real connection, and the energy that only comes from getting the whole team in one room.",
      sections: [
        {
          title: "Strategy",
          detail: "GTM deep dives, 2026 OKRs, and full-org alignment sessions.",
        },
        {
          title: "Product",
          detail:
            "Roadmap alignment, sharpened positioning, and how we talk about what we do.",
        },
        {
          title: "Craft",
          detail:
            "Hands-on workshops and skill-building to level up your craft.",
        },
        {
          title: "Connection",
          detail:
            "Team dinners, Isla Verde experiences, and unstructured time together.",
        },
      ],
    },
  },
  hotel: {
    lede:
      "Everything you need to get to Isla Verde and feel right at home \u2014 from the tarmac at IVD to the sand at your feet.",
    travelTitle: { main: "Flights, transfers,", emphasis: "passports." },
    intro:
      "An all-inclusive beachfront resort on Costa Azul Beach \u2014 think open-air pavilions, palm-lined paths, and the Caribbean at your doorstep.",
    flightsNote:
      "Coordinated by the events team. Booking instructions coming via Slack.",
    passportNote:
      "US travelers don\u2019t need a visa for stays under 30 days, but a valid passport is required. Double-check your expiration date now.",
    fieldNotes: [
      {
        title: "Airport transfers",
        body: "Group transfers from IVD to the resort will be coordinated \u2014 details coming soon. The resort is ~20 minutes from the airport.",
      },
      {
        title: "June weather",
        body: "Warm and tropical \u2014 highs around 88\u00b0F / 31\u00b0C, high humidity, brief afternoon showers. Check regional storm-season guidance closer to travel.",
      },
      {
        title: "Dress code",
        body: "Resort casual. Bring swimwear, sandals, light breathable clothing, sunscreen, and a light layer for air-conditioned spaces. One smart-casual outfit for a nicer dinner.",
      },
    ],
    hero: [
      {
        src: "/images/hotel/aerial-2.jpg",
        alt: "Palma Verde Resort \u2014 aerial view",
        label: "aerial view",
      },
      {
        src: "/images/hotel/pool-1.jpg",
        alt: "Resort pool",
        label: "pool",
      },
      {
        src: "/images/hotel/grounds-1.jpg",
        alt: "Resort grounds",
        label: "grounds",
      },
      {
        src: "/images/hotel/exterior-3.jpg",
        alt: "Palma Verde Resort at dusk",
        label: "exterior \u00b7 at dusk",
      },
    ],
  },
} satisfies z.input<typeof EventContent>;
