import { getTeamById } from "@calcom/features/teams/lib/teams";

import type { TrpcSessionUser } from "../../../types";

import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  return getTeamById(input.teamId, { userId: ctx.user.id });
};
