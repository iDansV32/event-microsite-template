import type { z } from "zod";
import type { Agenda } from "@/lib/schemas";

export const agenda = {
  title: { main: "Four days in", emphasis: "Isla Verde." },
  lede: "The program unfolds gently \u2014 long mornings, generous afternoons, and evenings together. Times in local (AST).",
  notice: "Placeholder agenda. Sessions, times, and speakers are illustrative \u2014 the final program is being finalized and will be updated here.",
  days: [
    {
      date: "2026-06-01",
      weekday: "Monday",
      mood: "Arrive & unwind",
      image: {
        src: "/images/hotel/beach-1.jpg",
        alt: "Monday \u2014 arrival at the resort",
        label: "monday \u00b7 4:5",
      },
      sessions: [
        {
          time: "12:00",
          title: "Arrivals & Resort Check-In",
          detail:
            "Palma Verde Resort \u00b7 Rooms available from 3 PM \u00b7 Badge pickup in lobby",
        },
        {
          time: "18:00",
          title: "Welcome Reception",
          detail: "Beachfront \u00b7 Cocktails and dinner at sunset",
        },
      ],
    },
    {
      date: "2026-06-02",
      weekday: "Tuesday",
      mood: "Align on 2026",
      image: {
        src: "/images/hotel/exterior-1.jpg",
        alt: "Tuesday \u2014 strategy day",
        label: "tuesday \u00b7 4:5",
      },
      sessions: [
        { time: "08:00", title: "Breakfast", detail: "Main Hall \u00b7 Doors open 07:45" },
        {
          time: "09:00",
          title: "Opening Remarks",
          detail: "Main Ballroom \u2014 the year ahead",
        },
        {
          time: "10:00",
          title: "2026 Strategy Deep Dive",
          detail: "Keynote + panel discussion",
          featured: true,
        },
        {
          time: "12:30",
          title: "Lunch",
          detail: "Networking tables organized by team",
        },
        {
          time: "14:00",
          title: "Breakouts: Skills Workshops",
          detail: "Choose one session \u2014 details coming soon",
          tbd: true,
        },
        {
          time: "18:30",
          title: "Team Dinners",
          detail: "Small-group dinners offsite",
        },
      ],
    },
    {
      date: "2026-06-03",
      weekday: "Wednesday",
      mood: "Build & connect",
      image: {
        src: "/images/hotel/pool-2.jpg",
        alt: "Wednesday \u2014 open afternoon by the pool",
        label: "wednesday \u00b7 4:5",
      },
      sessions: [
        { time: "08:00", title: "Breakfast", detail: "Main Hall" },
        {
          time: "09:00",
          title: "Product & Roadmap",
          detail: "Ballroom \u2014 where we\u2019re going",
        },
        {
          time: "11:00",
          title: "Cross-Team Working Sessions",
          detail: "Breakout rooms \u00b7 sign up on-site",
          tbd: true,
        },
        {
          time: "14:30",
          title: "Open Afternoon",
          detail: "Beach \u00b7 pool \u00b7 unstructured time",
        },
        {
          time: "18:00",
          title: "Evening Activity",
          detail: "Resort experience \u2014 optional, opt-in on-site",
          tbd: true,
        },
      ],
    },
    {
      date: "2026-06-04",
      weekday: "Thursday",
      mood: "Close & carry home",
      image: {
        src: "/images/hotel/beach-3.jpg",
        alt: "Thursday \u2014 closing day on the beach",
        label: "thursday \u00b7 4:5",
      },
      sessions: [
        {
          time: "09:00",
          title: "Closing Session",
          detail: "Ballroom \u2014 commitments + send-off",
        },
        {
          time: "11:30",
          title: "Closing Lunch",
          detail: "Boxed options available for travelers",
        },
        {
          time: "13:00",
          title: "Safe Travels",
          detail: "Rooms must be vacated by 12 PM",
        },
      ],
    },
  ],
} satisfies z.input<typeof Agenda>;
