import { deleteTeam } from "@calcom/features/teams/lib/teams";

import type { TrpcSessionUser } from "../../../types";

import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  await deleteTeam(input.teamId, { userId: ctx.user.id });
};
