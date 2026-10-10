import { getInviteLink } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TGetInviteLinkInputSchema } from "./getInviteLink.schema";

type GetInviteLinkOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInviteLinkInputSchema;
};

export const getInviteLinkHandler = async ({ ctx, input }: GetInviteLinkOptions) => {
  return getInviteLink(input.teamId, { userId: ctx.user.id });
};
