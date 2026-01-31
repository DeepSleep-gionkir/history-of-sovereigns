import { z } from "zod";

export const FoundingFormSchema = z.object({
  // Identity
  name: z.string().min(2, "Nation name must be at least 2 characters").max(30),
  rulerTitle: z.string().min(1, "Ruler title is required").max(20),

  // Flavor / Narrative
  history: z.string().max(500).optional(),

  // Core Ideology (Select One)
  ideology: z.enum([
    "AUTHORITY", // Focus: Military/Stability
    "LIBERTY", // Focus: Economy/Happiness
    "TRADITION", // Focus: Culture/Legitimacy
    "PROGRESS", // Focus: Tech/Efficiency
  ]),

  // Initial Policies (Simple booleans for MVP Wizard)
  policies: z.object({
    militaristic: z.boolean(),
    isolationist: z.boolean(),
  }),
});

export type FoundingForm = z.infer<typeof FoundingFormSchema>;

export type FoundingStep =
  | "INTRO"
  | "IDENTITY"
  | "IDEOLOGY"
  | "CONFIRM"
  | "RITUAL";
