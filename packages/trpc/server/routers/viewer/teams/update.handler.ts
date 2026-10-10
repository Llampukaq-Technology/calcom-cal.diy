import { updateTeam } from "@calcom/features/teams/lib/teams";

import type { TrpcSessionUser } from "../../../types";

import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const { teamId, ...update } = input;
  return updateTeam(teamId, update, { userId: ctx.user.id });
};
