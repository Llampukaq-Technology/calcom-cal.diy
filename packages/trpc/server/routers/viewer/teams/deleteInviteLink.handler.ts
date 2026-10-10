import { deleteInviteLink } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TDeleteInviteLinkInputSchema } from "./deleteInviteLink.schema";

type DeleteInviteLinkOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInviteLinkInputSchema;
};

export const deleteInviteLinkHandler = async ({ ctx, input }: DeleteInviteLinkOptions) => {
  await deleteInviteLink(input.teamId, { userId: ctx.user.id });
};
