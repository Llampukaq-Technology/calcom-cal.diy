import { prisma } from "@calcom/prisma";
import { getPublicEventSelect } from "./getPublicEvent";

// Same helper as the private one in getPublicEvent: only plain slug lookups exist in
// Cal.diy (no org requestedSlug flow), so this never needs the redirect variant.
const getSlugOrRequestedSlug = (slug: string) => ({ slug });

export async function getTeamEventType(teamSlug: string, meetingSlug: string, orgSlug: string | null) {
  return await prisma.eventType.findFirst({
    where: {
      team: {
        ...getSlugOrRequestedSlug(teamSlug),
        parent: orgSlug ? getSlugOrRequestedSlug(orgSlug) : null,
      },
      OR: [{ slug: meetingSlug }, { slug: { startsWith: `${meetingSlug}-team-id-` } }],
    },
    // IMPORTANT:
    // This ensures that the queried event type has everything expected in Booker
    select: getPublicEventSelect(false),
    orderBy: {
      slug: "asc",
    },
  });
}
