import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

export const ZSetMembershipRoleInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

export type TSetMembershipRoleInputSchema = z.infer<typeof ZSetMembershipRoleInputSchema>;
