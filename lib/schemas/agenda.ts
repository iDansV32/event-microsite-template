import { z } from "zod";
import { ImageSlot } from "./image";

export const Session = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().default(""),
  featured: z.boolean().optional(),
  tbd: z.boolean().optional(),
});

export const Day = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date required"),
  weekday: z.string().min(1),
  mood: z.string().optional(),
  image: ImageSlot.optional(),
  /** CSS color value for the day's accent (tab highlight, date, session
      time color, etc.). Optional — the page rotates through a default
      palette based on day index when omitted. */
  accent: z.string().optional(),
  sessions: z.array(Session).min(1),
});

export const Agenda = z.object({
  /** Page headline. Two parts so the emphasis half renders italic. Falls
      back to "{N} days in {cityShort}." when absent. */
  title: z
    .object({
      main: z.string().min(1),
      emphasis: z.string().optional(),
    })
    .optional(),
  /** Page lede under the title. Falls back to a neutral default. */
  lede: z.string().optional(),
  /** Warning banner rendered at the top of the page, e.g. "Placeholder
      agenda" for drafts. Hidden when absent. */
  notice: z.string().optional(),
  days: z.array(Day).min(1),
});

export type Agenda = z.infer<typeof Agenda>;
export type Day = z.infer<typeof Day>;
export type Session = z.infer<typeof Session>;
