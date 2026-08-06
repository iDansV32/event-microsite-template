import { z } from "zod";

export const Brand = z.object({
  client: z.string().min(1),
  shortName: z.string().min(1),
  longName: z.string().min(1),
  tagline: z.string().min(1),
});

export const Dates = z.object({
  startISO: z.string().datetime({ offset: true }),
  endISO: z.string().datetime({ offset: true }),
  display: z.string().min(1),
  displayShort: z.string().min(1),
});

export const Venue = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  cityShort: z.string().optional(),
  neighborhood: z.string().optional(),
  url: z.string().url().optional(),
});

export const Airport = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
  detail: z.string().optional(),
});

export const Registration = z.object({
  isOpen: z.boolean(),
  opensISO: z.string().datetime({ offset: true }).optional(),
  closesISO: z.string().datetime({ offset: true }).optional(),
});

export const Rates = z.object({
  extensionEmployee: z.number().nonnegative().optional(),
  extensionPlusOne: z.number().nonnegative().optional(),
  plusOne: z.number().nonnegative().optional(),
});

export const Contact = z.object({
  slackChannel: z.string().optional(),
  supportEmail: z.string().email().optional(),
});

// ─── Editorial content slots ────────────────────────────────────────────────
// These drive the per-page copy that used to be hardcoded in the template.
// Every field is optional: pages fall back to generic structure (or hide the
// section entirely) when a slot is absent. The Claude skill is expected to
// populate whichever slots are relevant for a given event.

// ImageSlot is shared across pages (overview, hotel, agenda).
// Defined in ./image.ts so agenda.ts can import without a circular dep.
import { ImageSlot } from "./image";
export { ImageSlot };

export const OverviewEditorial = z.object({
  /** Big marquee headline. Two parts so the emphasis half can render italic. */
  headline: z
    .object({
      main: z.string().min(1),
      emphasis: z.string().optional(),
    })
    .optional(),
  /** Small meta tag next to the registration chip. Often an issue/season label. */
  issueLabel: z.string().optional(),
  /** Extra masthead cells after the automatic Dates + Venue cells. */
  mastheadStats: z
    .array(
      z.object({
        eyebrow: z.string().min(1),
        value: z.string().min(1),
        sub: z.string().optional(),
      }),
    )
    .optional(),
  /** Countdown block heading — "before <emphasis> after". */
  countdownHeading: z
    .object({
      before: z.string().optional(),
      emphasis: z.string().min(1),
      after: z.string().optional(),
    })
    .optional(),
  /** Caption under the hero image. Figure label + sentence. */
  heroCaption: z
    .object({
      figLabel: z.string().optional(),
      text: z.string().min(1),
    })
    .optional(),
  /** Caption under the 3-photo mosaic. Hidden when absent. */
  mosaicCaption: z.string().optional(),
  /** Top-right hero image on the page (or omit to render the placeholder). */
  hero: ImageSlot.optional(),
  /** 3-photo reference mosaic below the countdown. Hidden when absent. */
  mosaic: z.array(ImageSlot).optional(),
  /** "What to expect" program block: intro sentence + N themed sections. */
  program: z
    .object({
      intro: z.string().min(1),
      sections: z
        .array(
          z.object({
            title: z.string().min(1),
            detail: z.string().min(1),
          }),
        )
        .min(1),
    })
    .optional(),
  /** Detail copy shown in the "Important dates" rail next to the arrival row.
      e.g. "Check-in at 3 PM · Welcome reception at 6 PM." Omit for no copy. */
  arrivalDetail: z.string().optional(),
  /** Same, for the departure row. */
  departureDetail: z.string().optional(),
});

export const HotelEditorial = z.object({
  /** Page lede under "Hotel & travel." Falls back to a neutral one-liner. */
  lede: z.string().optional(),
  /** Travel section heading. Two parts so the emphasis half renders italic.
      If omitted, the shell picks one of a few neutral defaults based on
      what other travel content is configured. */
  travelTitle: z
    .object({
      main: z.string().min(1),
      emphasis: z.string().optional(),
    })
    .optional(),
  /** Italic paragraph under the venue's name — replaces destination claims. */
  intro: z.string().optional(),
  /** Small copy under the "Booking flights" heading. */
  flightsNote: z.string().optional(),
  /** Dedicated callout block (rendered with danger accent) if present. */
  passportNote: z.string().optional(),
  /** Items in the "A few things to know" section. Hides the whole section
      when absent or empty. */
  fieldNotes: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .optional(),
  /** Hero mosaic at the top of the Hotel page. The hotel-mosaic CSS grid
      reserves bespoke spans for 4 slots (tall-left, mid-top, mid-bottom,
      wide-right); images beyond index 3 flow into the grid in default order. */
  hero: z.array(ImageSlot).optional(),
});

export const EventContent = z.object({
  brand: Brand,
  dates: Dates,
  venue: Venue,
  airport: Airport.optional(),
  registration: Registration,
  rates: Rates.optional(),
  contact: Contact.optional(),
  overview: OverviewEditorial.optional(),
  hotel: HotelEditorial.optional(),
});

export type EventContent = z.infer<typeof EventContent>;
export type Brand = z.infer<typeof Brand>;
export type Dates = z.infer<typeof Dates>;
export type Venue = z.infer<typeof Venue>;
