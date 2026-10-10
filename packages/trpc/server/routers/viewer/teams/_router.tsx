import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { createHandler } from "./create.handler";
import { ZCreateInputSchema } from "./create.schema";
import { createInviteLinkHandler } from "./createInviteLink.handler";
import { ZCreateInviteLinkInputSchema } from "./createInviteLink.schema";
import { deleteHandler } from "./delete.handler";
import { ZDeleteInputSchema } from "./delete.schema";
import { deleteInviteLinkHandler } from "./deleteInviteLink.handler";
import { ZDeleteInviteLinkInputSchema } from "./deleteInviteLink.schema";
import { getHandler } from "./get.handler";
import { ZGetInputSchema } from "./get.schema";
import { getInviteLinkHandler } from "./getInviteLink.handler";
import { ZGetInviteLinkInputSchema } from "./getInviteLink.schema";
import { getMembersHandler } from "./getMembers.handler";
import { ZGetMembersInputSchema } from "./getMembers.schema";
import { inviteMembershipByLinkHandler } from "./inviteMembershipByLink.handler";
import { ZInviteMembershipByLinkInputSchema } from "./inviteMembershipByLink.schema";
import { leaveTeamHandler } from "./leaveTeam.handler";
import { ZLeaveTeamInputSchema } from "./leaveTeam.schema";
import { listHandler } from "./list.handler";
import { removeMembershipHandler } from "./removeMembership.handler";
import { ZRemoveMembershipInputSchema } from "./removeMembership.schema";
import { setMembershipRoleHandler } from "./setMembershipRole.handler";
import { ZSetMembershipRoleInputSchema } from "./setMembershipRole.schema";
import { updateHandler } from "./update.handler";
import { ZUpdateInputSchema } from "./update.schema";

export const teamsRouter = router({
  // Returns the teams the logged-in user is a member of, with their role
  list: authedProcedure.query(({ ctx }) => listHandler({ ctx })),
  // Retrieves a team by id
  get: authedProcedure.input(ZGetInputSchema).query((opts) => getHandler(opts)),
  create: authedProcedure.input(ZCreateInputSchema).mutation((opts) => createHandler(opts)),
  // Allows team owner/admin to update team settings
  update: authedProcedure.input(ZUpdateInputSchema).mutation((opts) => updateHandler(opts)),
  delete: authedProcedure.input(ZDeleteInputSchema).mutation((opts) => deleteHandler(opts)),
  // Lists members of a team
  getMembers: authedProcedure.input(ZGetMembersInputSchema).query((opts) => getMembersHandler(opts)),
  inviteLink: router({
    create: authedProcedure.input(ZCreateInviteLinkInputSchema).mutation((opts) => createInviteLinkHandler(opts)),
    get: authedProcedure.input(ZGetInviteLinkInputSchema).query((opts) => getInviteLinkHandler(opts)),
    delete: authedProcedure
      .input(ZDeleteInviteLinkInputSchema)
      .mutation((opts) => deleteInviteLinkHandler(opts)),
  }),
  // Requires a session: accepts a team invite link on behalf of the logged-in user (same as upstream inviteMemberByToken)
  inviteMembershipByLink: authedProcedure
    .input(ZInviteMembershipByLinkInputSchema)
    .mutation((opts) => inviteMembershipByLinkHandler(opts)),
  setMembershipRole: authedProcedure
    .input(ZSetMembershipRoleInputSchema)
    .mutation((opts) => setMembershipRoleHandler(opts)),
  removeMembership: authedProcedure
    .input(ZRemoveMembershipInputSchema)
    .mutation((opts) => removeMembershipHandler(opts)),
  leaveTeam: authedProcedure.input(ZLeaveTeamInputSchema).mutation((opts) => leaveTeamHandler(opts)),
});
