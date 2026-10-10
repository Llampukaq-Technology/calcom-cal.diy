import { setMembershipRole } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TSetMembershipRoleInputSchema } from "./setMembershipRole.schema";

type SetMembershipRoleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetMembershipRoleInputSchema;
};

export const setMembershipRoleHandler = async ({ ctx, input }: SetMembershipRoleOptions) => {
  await setMembershipRole(input.teamId, input.memberId, input.role, { userId: ctx.user.id });
};
