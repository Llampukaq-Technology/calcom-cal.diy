import type { Prisma, Team } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { prisma } from "@calcom/prisma";
import { ErrorWithCode } from "@calcom/lib/errors";

import {
  assertManagership,
  assertOwnership,
  getMembership,
  getTeamOrThrow,
  requireAcceptedMembership,
  requireManagership,
} from "./permissions";

export type CreateTeamInput = {
  name: string;
  slug: string;
  logoUrl?: string | null;
};

export type UpdateTeamInput = Partial<{
  name: string;
  slug: string;
  logoUrl: string | null;
  bio: string | null;
  hideBranding: boolean;
  hideTeamProfileLink: boolean;
  hideBookATeamMember: boolean;
  isPrivate: boolean;
  timeZone: string;
  weekStart: string;
  timeFormat: number | null;
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
}>;

export type TeamMember = {
  id: number;
  name: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  role: MembershipRole;
  accepted: boolean;
};

/**
 * Decision: reject slugs that collide with a user's username. Cal.diy has a single global
 * username namespace (no org-scoped profiles), so a team slug and a user username resolving
 * from the same URL segment would be ambiguous. Same rejection the upstream org flow applies
 * ("team_slug_exists_as_user"), extended to every team create/update because teams always
 * live in the root namespace here (parentId is always null).
 */
async function assertSlugAvailable(slug: string, ignoreTeamId?: number): Promise<void> {
  const existingTeam = await prisma.team.findFirst({
    where: {
      slug,
      parentId: null,
      ...(ignoreTeamId !== undefined && { NOT: { id: ignoreTeamId } }),
    },
    select: { id: true },
  });
  if (existingTeam) {
    throw ErrorWithCode.Factory.BadRequest("team_url_taken");
  }

  const existingUser = await prisma.user.findFirst({
    where: { username: slug },
    select: { id: true },
  });
  if (existingUser) {
    throw ErrorWithCode.Factory.BadRequest("team_slug_exists_as_user");
  }
}

export async function createTeam(
  input: CreateTeamInput,
  actor: { userId: number }
): Promise<Team> {
  await assertSlugAvailable(input.slug);

  // Full scalar row (no include): keeps the generated Team type intact for the frozen
  // service contract; relations are always fetched separately with explicit selects.
  return prisma.team.create({
    data: {
      name: input.name,
      slug: input.slug,
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      members: {
        create: {
          userId: actor.userId,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
    },
  });
}

export async function updateTeam(
  teamId: number,
  input: UpdateTeamInput,
  actor: { userId: number }
): Promise<Team> {
  await requireManagership(teamId, actor.userId);
  const team = await getTeamOrThrow(teamId);

  if (input.slug !== undefined && input.slug !== team.slug) {
    await assertSlugAvailable(input.slug, teamId);
  }

  // Only apply keys that were explicitly sent; undefined must not overwrite stored values.
  const data: Prisma.TeamUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.hideBranding !== undefined) data.hideBranding = input.hideBranding;
  if (input.hideTeamProfileLink !== undefined) data.hideTeamProfileLink = input.hideTeamProfileLink;
  if (input.hideBookATeamMember !== undefined) data.hideBookATeamMember = input.hideBookATeamMember;
  if (input.isPrivate !== undefined) data.isPrivate = input.isPrivate;
  if (input.timeZone !== undefined) data.timeZone = input.timeZone;
  if (input.weekStart !== undefined) data.weekStart = input.weekStart;
  if (input.timeFormat !== undefined) data.timeFormat = input.timeFormat;
  if (input.theme !== undefined) data.theme = input.theme;
  if (input.brandColor !== undefined) data.brandColor = input.brandColor;
  if (input.darkBrandColor !== undefined) data.darkBrandColor = input.darkBrandColor;

  return prisma.team.update({
    where: { id: teamId },
    data,
  });
}

export async function deleteTeam(teamId: number, actor: { userId: number }): Promise<void> {
  const membership = await requireAcceptedMembership(teamId, actor.userId);
  assertOwnership(membership);

  // VerificationToken.teamId has no cascade rule; drop invite tokens before the team itself.
  // Everything else (memberships, event types, hosts, ...) cascades from the schema.
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: { teamId },
    }),
    prisma.team.delete({
      where: { id: teamId },
    }),
  ]);
}

/**
 * Returns the team if the actor holds any membership (pending included, so invited users can
 * preview the team before accepting), null when the team does not exist or the actor is not
 * a member.
 */
export async function getTeamById(teamId: number, actor: { userId: number }): Promise<Team | null> {
  const membership = await getMembership(teamId, actor.userId);
  if (!membership) {
    return null;
  }
  // Full scalar row (no include): keeps the generated Team type intact for the frozen
  // service contract; relations are always fetched separately with explicit selects.
  return prisma.team.findUnique({
    where: { id: teamId },
  });
}

/**
 * Accepted memberships only. Pending invitations surface through the invite-accept flow,
 * not through this listing (same split as upstream list/listInvites).
 */
export async function listUserTeams(userId: number): Promise<Array<Team & { role: MembershipRole }>> {
  const [teams, memberships] = await Promise.all([
    // Full scalar row (no include): keeps the generated Team type intact for the frozen
    // service contract; relations are always fetched separately with explicit selects.
    prisma.team.findMany({
      where: { members: { some: { userId, accepted: true } } },
    }),
    prisma.membership.findMany({
      where: { userId, accepted: true },
      select: { teamId: true, role: true },
    }),
  ]);

  const roleByTeamId = new Map(memberships.map((membership) => [membership.teamId, membership.role]));

  return teams.flatMap((team) => {
    const role = roleByTeamId.get(team.id);
    return role ? [{ ...team, role }] : [];
  });
}

export async function getMembers(
  teamId: number,
  actor: { userId: number }
): Promise<TeamMember[]> {
  const membership = await requireAcceptedMembership(teamId, actor.userId);
  const team = await getTeamOrThrow(teamId);
  // Private teams only expose their member list to managers.
  if (team.isPrivate) {
    assertManagership(membership);
  }

  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: {
      role: true,
      accepted: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return memberships.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    username: member.user.username,
    avatarUrl: member.user.avatarUrl,
    role: member.role,
    accepted: member.accepted,
  }));
}
