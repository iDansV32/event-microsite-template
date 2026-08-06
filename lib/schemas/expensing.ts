import { z } from "zod";

export const ExpenseItem = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const HowToSubmitStep = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const HowToSubmitCallout = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  /** Visual tone for the callout card. Defaults to "warn" (amber). */
  tone: z.enum(["warn", "teal"]).optional(),
});

export const Expensing = z.object({
  covered: z.array(ExpenseItem).min(1),
  notCovered: z.array(ExpenseItem).min(1),
  /** Expense-submission deadline block at the foot of the page. Omit to
      hide the block entirely. `date` is the slashed display (e.g. "08/14");
      `body` is the sentence explaining the deadline. */
  submissionDeadline: z
    .object({
      date: z.string().min(1),
      body: z.string().min(1),
    })
    .optional(),
  /** If present, the "Open travel tool →" button becomes an active link.
      If absent, the button is omitted. */
  travelToolUrl: z.string().url().optional(),
  /** "How to submit" tab content. If absent, the tab is hidden entirely.
      Steps render in a grid sized to steps.length; callouts render below. */
  howToSubmit: z
    .object({
      steps: z.array(HowToSubmitStep).min(1),
      callouts: z.array(HowToSubmitCallout).optional(),
    })
    .optional(),
});

export type Expensing = z.infer<typeof Expensing>;
export type ExpenseItem = z.infer<typeof ExpenseItem>;
export type HowToSubmitStep = z.infer<typeof HowToSubmitStep>;
export type HowToSubmitCallout = z.infer<typeof HowToSubmitCallout>;
