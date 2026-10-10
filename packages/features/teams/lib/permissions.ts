import { ErrorWithCode } from "@calcom/lib/errors";
import type { Membership } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { prisma } from "@calcom/prisma";

/**
 * Role model for teams in Cal.diy (parentId === null only):
 * - OWNER / ADMIN (accepted): manage team settings, invite links and members.
 * - OWNER: delete the team, award/change the OWNER role, remove other owners.
 * - Any accepted member: view the member list (unless the team is private) and leave.
 * Pending (not accepted) memberships grant no permissions.
 */
const MANAGER_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

export const membershipSelect = {
  id: true,
  teamId: true,
  userId: true,
  role: true,
  accepted: true,
} satisfies Prisma.MembershipSelect;

export type MembershipRecord = Pick<Membership, keyof typeof membershipSelect>;

export async function getTeamOrThrow(teamId: number) {
  // Full scalar row (no include): keeps the generated Team type intact for the frozen
  // service contract; relations are always fetched separately with explicit selects.
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });
  if (!team) {
    throw ErrorWithCode.Factory.NotFound("team_not_found");
  }
  return team;
}

export async function getMembership(teamId: number, userId: number): Promise<MembershipRecord | null> {
  return prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: membershipSelect,
  });
}

export async function requireAcceptedMembership(
  teamId: number,
  userId: number
): Promise<MembershipRecord> {
  const membership = await getMembership(teamId, userId);
  if (!membership) {
    throw ErrorWithCode.Factory.NotFound("membership_not_found");
  }
  if (!membership.accepted) {
    throw ErrorWithCode.Factory.Forbidden("membership_not_accepted");
  }
  return membership;
}

export function assertManagership(membership: MembershipRecord): void {
  if (!membership.accepted || !MANAGER_ROLES.includes(membership.role)) {
    throw ErrorWithCode.Factory.Forbidden("insufficient_permissions");
  }
}

export function assertOwnership(membership: MembershipRecord): void {
  if (!membership.accepted || membership.role !== MembershipRole.OWNER) {
    throw ErrorWithCode.Factory.Forbidden("only_owners_can_do_this");
  }
}

export async function requireManagership(teamId: number, userId: number): Promise<MembershipRecord> {
  const membership = await getMembership(teamId, userId);
  if (!membership) {
    throw ErrorWithCode.Factory.NotFound("membership_not_found");
  }
  assertManagership(membership);
  return membership;
}

export async function countOwners(teamId: number): Promise<number> {
  return prisma.membership.count({
    where: { teamId, role: MembershipRole.OWNER },
  });
}
