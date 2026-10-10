import { randomBytes } from "node:crypto";

import { ErrorWithCode } from "@calcom/lib/errors";
// Value import: PrismaClientKnownRequestError is used in an instanceof check.
import { Prisma, type Team } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { prisma } from "@calcom/prisma";

import { countOwners, getMembership, getTeamOrThrow, requireManagership } from "./permissions";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRES_IN_DAYS = 7;

export type InviteLink = {
  token: string;
  expiresInDays: number | null;
};

/**
 * VerificationToken identifier for team invite links. Reusing the upstream convention keeps
 * team invite tokens distinguishable from other VerificationToken rows sharing the table.
 */
export function teamInviteIdentifier(teamId: number): string {
  return `invite-link-for-teamId-${teamId}`;
}

/**
 * Regenerates the team's invite link: one active link per team, creating a new token always
 * replaces the previous one.
 */
export async function createInviteLink(
  teamId: number,
  actor: { userId: number },
  expiresInDays: number = DEFAULT_EXPIRES_IN_DAYS
): Promise<{ token: string; expiresInDays: number }> {
  await getTeamOrThrow(teamId);
  await requireManagership(teamId, actor.userId);

  const token = randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: { teamId, identifier: teamInviteIdentifier(teamId) },
    }),
    prisma.verificationToken.create({
      data: {
        identifier: teamInviteIdentifier(teamId),
        token,
        expires: new Date(Date.now() + expiresInDays * DAY_IN_MS),
        expiresInDays,
        teamId,
      },
    }),
  ]);

  return { token, expiresInDays };
}

export async function getInviteLink(
  teamId: number,
  actor: { userId: number }
): Promise<InviteLink | null> {
  await getTeamOrThrow(teamId);
  await requireManagership(teamId, actor.userId);

  const verificationToken = await prisma.verificationToken.findFirst({
    where: { teamId, identifier: teamInviteIdentifier(teamId) },
    select: { token: true, expiresInDays: true, expires: true },
    orderBy: { id: "desc" },
  });

  if (!verificationToken) {
    return null;
  }

  // expiresInDays null means the link never expires (upstream convention).
  if (verificationToken.expiresInDays !== null && verificationToken.expires < new Date()) {
    return null;
  }

  return {
    token: verificationToken.token,
    expiresInDays: verificationToken.expiresInDays,
  };
}

export async function deleteInviteLink(teamId: number, actor: { userId: number }): Promise<void> {
  await getTeamOrThrow(teamId);
  await requireManagership(teamId, actor.userId);

  const verificationToken = await prisma.verificationToken.findFirst({
    where: { teamId, identifier: teamInviteIdentifier(teamId) },
    select: { id: true },
  });

  if (!verificationToken) {
    throw ErrorWithCode.Factory.NotFound("invite_link_not_found");
  }

  await prisma.verificationToken.delete({
    where: { id: verificationToken.id },
  });
}

/**
 * Adds the user as a pending MEMBER through an invite link. Expiry semantics follow upstream:
 * a token with expiresInDays null never expires. Acceptance itself stays pending until the
 * user accepts the membership.
 */
export async function acceptInviteByToken(
  token: string,
  userId: number
): Promise<{ team: Team; role: MembershipRole }> {
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      OR: [{ expiresInDays: null }, { expires: { gte: new Date() } }],
    },
    select: { teamId: true },
  });

  if (!verificationToken?.teamId) {
    throw ErrorWithCode.Factory.NotFound("invite_not_found");
  }

  // Full scalar row (no include): keeps the generated Team type intact for the frozen
  // service contract; relations are always fetched separately with explicit selects.
  const team = await prisma.team.findUnique({
    where: { id: verificationToken.teamId },
  });

  if (!team) {
    throw ErrorWithCode.Factory.NotFound("team_not_found");
  }

  try {
    await prisma.membership.create({
      data: {
        teamId: team.id,
        userId,
        role: MembershipRole.MEMBER,
        // Upstream creates a pending membership and later accepts it from a UI listing pending
        // invites; Cal.diy has no such UI, and the invite dialog already reads "Accept the
        // invitation", so accepting the link grants membership immediately.
        accepted: true,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw ErrorWithCode.Factory.Forbidden("already_member_of_team");
    }
    throw e;
  }

  return { team, role: MembershipRole.MEMBER };
}

export async function setMembershipRole(
  teamId: number,
  memberId: number,
  role: MembershipRole,
  actor: { userId: number }
): Promise<void> {
  const actorMembership = await requireManagership(teamId, actor.userId);
  const targetMembership = await getMembership(teamId, memberId);

  if (!targetMembership) {
    throw ErrorWithCode.Factory.NotFound("membership_not_found");
  }

  // Only owners can award the owner role (upstream legacy rule).
  if (role === MembershipRole.OWNER && actorMembership.role !== MembershipRole.OWNER) {
    throw ErrorWithCode.Factory.Forbidden("only_owners_can_award_owner_role");
  }

  // Admins cannot change the role of an owner.
  if (actorMembership.role === MembershipRole.ADMIN && targetMembership.role === MembershipRole.OWNER) {
    throw ErrorWithCode.Factory.Forbidden("admins_cannot_change_owner_role");
  }

  // Never leave a team without its only owner.
  if (targetMembership.role === MembershipRole.OWNER && (await countOwners(teamId)) <= 1) {
    throw ErrorWithCode.Factory.Forbidden("cannot_change_role_of_only_owner");
  }

  // Admins can only demote themselves, never promote themselves.
  if (
    actorMembership.role === MembershipRole.ADMIN &&
    memberId === actor.userId &&
    role !== MembershipRole.MEMBER
  ) {
    throw ErrorWithCode.Factory.Forbidden("admins_cannot_promote_themselves");
  }

  await prisma.membership.update({
    where: { userId_teamId: { userId: memberId, teamId } },
    data: { role },
  });
}

export async function removeMembership(
  teamId: number,
  memberId: number,
  actor: { userId: number }
): Promise<void> {
  const actorMembership = await requireManagership(teamId, actor.userId);

  if (memberId === actor.userId) {
    throw ErrorWithCode.Factory.Forbidden("cannot_remove_yourself_use_leave_team");
  }

  const targetMembership = await getMembership(teamId, memberId);
  if (!targetMembership) {
    throw ErrorWithCode.Factory.NotFound("membership_not_found");
  }

  // Only a team owner can remove another team owner (upstream legacy rule).
  if (targetMembership.role === MembershipRole.OWNER) {
    if (actorMembership.role !== MembershipRole.OWNER) {
      throw ErrorWithCode.Factory.Forbidden("only_owners_can_remove_owners");
    }
    if ((await countOwners(teamId)) <= 1) {
      throw ErrorWithCode.Factory.Forbidden("cannot_remove_only_owner");
    }
  }

  // Same cleanup as upstream removeFromTeam: drop the member from team event type hosts and
  // managed event types before deleting the membership.
  await prisma.$transaction([
    prisma.host.deleteMany({
      where: { userId: memberId, eventType: { teamId } },
    }),
    prisma.eventType.deleteMany({
      where: { parent: { teamId }, userId: memberId },
    }),
    prisma.membership.delete({
      where: { userId_teamId: { userId: memberId, teamId } },
    }),
  ]);
}

export async function leaveTeam(teamId: number, userId: number): Promise<void> {
  const membership = await getMembership(teamId, userId);

  if (!membership) {
    throw ErrorWithCode.Factory.NotFound("membership_not_found");
  }

  // The last owner cannot leave; ownership must be transferred first.
  if (membership.role === MembershipRole.OWNER && (await countOwners(teamId)) <= 1) {
    throw ErrorWithCode.Factory.Forbidden("cannot_leave_team_you_own");
  }

  await prisma.membership.delete({
    where: { userId_teamId: { userId, teamId } },
  });
}
