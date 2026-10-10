import { createTeam } from "@calcom/features/teams/lib/teams";

import type { TrpcSessionUser } from "../../../types";

import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  return createTeam(input, { userId: ctx.user.id });
};
