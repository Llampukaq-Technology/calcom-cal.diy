import { listUserTeams } from "@calcom/features/teams/lib/teams";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  return listUserTeams(ctx.user.id);
};
