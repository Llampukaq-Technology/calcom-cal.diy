import { acceptInviteByToken } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TInviteMembershipByLinkInputSchema } from "./inviteMembershipByLink.schema";

type InviteMembershipByLinkOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMembershipByLinkInputSchema;
};

export const inviteMembershipByLinkHandler = async ({ ctx, input }: InviteMembershipByLinkOptions) => {
  return acceptInviteByToken(input.token, ctx.user.id);
};
