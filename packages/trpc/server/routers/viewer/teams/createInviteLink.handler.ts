import { createInviteLink } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TCreateInviteLinkInputSchema } from "./createInviteLink.schema";

type CreateInviteLinkOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInviteLinkInputSchema;
};

export const createInviteLinkHandler = async ({ ctx, input }: CreateInviteLinkOptions) => {
  return createInviteLink(input.teamId, { userId: ctx.user.id }, input.expiresInDays);
};
