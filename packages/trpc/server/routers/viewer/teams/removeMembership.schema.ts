import { z } from "zod";

export const ZRemoveMembershipInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
});

export type TRemoveMembershipInputSchema = z.infer<typeof ZRemoveMembershipInputSchema>;
