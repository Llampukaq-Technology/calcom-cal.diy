import { leaveTeam } from "@calcom/features/teams/lib/invitations";

import type { TrpcSessionUser } from "../../../types";

import type { TLeaveTeamInputSchema } from "./leaveTeam.schema";

type LeaveTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TLeaveTeamInputSchema;
};

export const leaveTeamHandler = async ({ ctx, input }: LeaveTeamOptions) => {
  await leaveTeam(input.teamId, ctx.user.id);
};
