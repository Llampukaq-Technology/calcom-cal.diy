import { z } from "zod";

export const ZCreateInviteLinkInputSchema = z.object({
  teamId: z.number(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type TCreateInviteLinkInputSchema = z.infer<typeof ZCreateInviteLinkInputSchema>;
