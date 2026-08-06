import type { z } from "zod";
import type { Expensing } from "@/lib/schemas";

export const expensing = {
  covered: [
    {
      title: "Flights \u2014 via travel tool only",
      detail:
        "Round-trip in-policy flight. Must be booked through the travel tool. Out-of-policy bookings without approval are your financial responsibility.",
    },
    {
      title: "Hotel \u2014 June 1\u20134",
      detail:
        "Managed via events team rooming list. Register by the registration deadline. No booking action needed. If your flight is 6+ hours, you may arrive the day before \u2014 that night is covered.",
    },
    {
      title: "Ground transportation",
      detail:
        "All rideshare, taxi, and public transit is covered. Use your corporate card. Max $200/ride \u2014 provide a written reason if you exceed.",
    },
    {
      title: "Meals in transit \u2014 up to $105/day",
      detail:
        "Suggested: $25 breakfast \u00b7 $30 lunch \u00b7 $50 dinner (incl. tax & tip). Most meals are provided at the event.",
    },
    {
      title: "1 checked bag each way",
      detail:
        "Pay via corporate card at check-in or submit for reimbursement.",
    },
    {
      title: "In-flight Wi-Fi (work only)",
      detail:
        "Covered for work travel. Use your corporate card to purchase.",
    },
    {
      title: "Airport parking / driving",
      detail:
        "Mileage at standard IRS rate + parking, up to $200 roundtrip total.",
    },
    {
      title: "TSA Precheck / Global Entry",
      detail: "Submit reimbursement through the travel tool.",
    },
  ],
  notCovered: [
    {
      title: "Flights booked outside the tool",
      detail:
        "Loyalty points or \u201ccheaper outside\u201d are not valid reasons. No exceptions without prior approval in #offsite-2026.",
    },
    {
      title: "Cabin upgrades / lounge access",
      detail:
        "Comfort or airline preference are not valid reasons to upgrade. Lounge access is not covered.",
    },
    {
      title: "Personal hotel charges",
      detail:
        "Spa, room service, minibar, and incidentals are yours. Bring a personal card at check-in.",
    },
    {
      title: "Extra nights for cheaper flights",
      detail:
        "Arriving early or staying late purely to save on airfare \u2014 the extra night is on you.",
    },
    {
      title: "Personal travel extensions",
      detail:
        "Flights or hotels outside event dates for personal reasons are your cost.",
    },
    {
      title: "Plus-one / guest expenses",
      detail: "Plus-ones welcome but not covered \u2014 $130/person/day.",
    },
    {
      title: "Personal alcohol / bar tabs",
      detail: "Hosted receptions are covered. Personal bar tabs are not.",
    },
  ],
  submissionDeadline: {
    date: "08/14",
    body: "All expenses must be submitted by August 14 to be reimbursed.",
  },
  howToSubmit: {
    steps: [
      {
        title: "Use corp card",
        detail:
          "Your corporate card is active while traveling. Use it for ground transport, bags, meals, and Wi-Fi.",
      },
      {
        title: "Reimbursements",
        detail:
          "US employees \u2192 Primary tool. International contractors \u2192 Contractor tool. EOR employees \u2192 EOR portal.",
      },
      {
        title: "Questions",
        detail:
          "Check Travel Guidance on intranet. Still stuck? Post in #offsite-2026.",
      },
    ],
    callouts: [
      {
        title: "Flight cancellations",
        body: "Covered for medical/family emergencies. For all others, you\u2019re responsible. Self-service in the travel tool \u2014 no notification needed unless emergency.",
        tone: "warn",
      },
      {
        title: "International travelers",
        body: "You\u2019re responsible for visas (up to $500 expensable). Allow 2\u20133 hrs per customs connection. $50 cell phone allowance available.",
        tone: "teal",
      },
    ],
  },
} satisfies z.input<typeof Expensing>;
