import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZUpdateInputSchema = z.object({
  teamId: z.number(),
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .transform((val) => slugify(val.trim()))
    .optional(),
  logoUrl: z.string().optional().nullable(),
  bio: z.string().optional(),
  hideBranding: z.boolean().optional(),
  hideTeamProfileLink: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  timeZone: z.string().optional(),
  weekStart: z.string().optional(),
  timeFormat: z.number().int().optional().nullable(),
  theme: z.string().optional().nullable(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
