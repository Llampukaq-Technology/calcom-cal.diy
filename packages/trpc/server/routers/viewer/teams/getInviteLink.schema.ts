import { z } from "zod";

export const ZGetInviteLinkInputSchema = z.object({
  teamId: z.number(),
});

export type TGetInviteLinkInputSchema = z.infer<typeof ZGetInviteLinkInputSchema>;
