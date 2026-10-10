import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCreateInputSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((val) => slugify(val.trim())),
  logoUrl: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
