import { removeMembership } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TRemoveMembershipInputSchema } from "./removeMembership.schema";

type RemoveMembershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveMembershipInputSchema;
};

export const removeMembershipHandler = async ({ ctx, input }: RemoveMembershipOptions) => {
  await removeMembership(input.teamId, input.memberId, { userId: ctx.user.id });
};
