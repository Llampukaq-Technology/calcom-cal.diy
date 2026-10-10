import { z } from "zod";

export const ZDeleteInviteLinkInputSchema = z.object({
  teamId: z.number(),
});

export type TDeleteInviteLinkInputSchema = z.infer<typeof ZDeleteInviteLinkInputSchema>;
