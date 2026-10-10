import { z } from "zod";

export const ZGetMembersInputSchema = z.object({
  teamId: z.number(),
});

export type TGetMembersInputSchema = z.infer<typeof ZGetMembersInputSchema>;
