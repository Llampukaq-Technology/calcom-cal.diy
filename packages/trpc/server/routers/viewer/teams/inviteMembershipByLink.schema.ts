import { z } from "zod";

export const ZInviteMembershipByLinkInputSchema = z.object({
  token: z.string(),
});

export type TInviteMembershipByLinkInputSchema = z.infer<typeof ZInviteMembershipByLinkInputSchema>;
