import { getMembers } from "@calcom/features/teams/lib/teams";

import type { TrpcSessionUser } from "../../../types";

import type { TGetMembersInputSchema } from "./getMembers.schema";

type GetMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMembersInputSchema;
};

export const getMembersHandler = async ({ ctx, input }: GetMembersOptions) => {
  return getMembers(input.teamId, { userId: ctx.user.id });
};
