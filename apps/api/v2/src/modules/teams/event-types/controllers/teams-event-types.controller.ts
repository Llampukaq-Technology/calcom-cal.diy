import { SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import { GetTeamEventTypesQuery_2024_06_14 } from "@calcom/platform-types";
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { VERSION_2024_06_14_VALUE } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetTeamEventTypesOutput } from "@/modules/teams/event-types/outputs/get-team-event-types.output";
import { OutputTeamEventTypesResponsePipe } from "@/modules/teams/event-types/pipes/output-team-event-types-response.pipe";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";

@Controller({
  path: "/v2/teams",
  version: VERSION_2024_06_14_VALUE,
})
@DocsTags("Event Types")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_06_14}. If not set to this value, the endpoint will default to an older version.`,
  example: VERSION_2024_06_14,
  required: true,
  schema: {
    default: VERSION_2024_06_14,
  },
})
export class TeamsEventTypesController_2024_06_14 {
  constructor(
    private readonly teamsEventTypesService: TeamsEventTypesService,
    private readonly outputTeamEventTypesResponsePipe: OutputTeamEventTypesResponsePipe
  ) {}

  // Access control: RolesGuard requires the authenticated user to hold at least the
  // TEAM_MEMBER role in the team from the teamId route param (system admins bypass).
  @Get("/:teamId/event-types")
  @Roles("TEAM_MEMBER")
  @UseGuards(ApiAuthGuard, RolesGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get team event types",
    description: `Use the optional \`sortCreatedAt\` query parameter to order results by creation date (by ID). Accepts "asc" (oldest first) or "desc" (newest first). When not provided, no explicit ordering is applied. Alternatively pass the \`eventSlug\` query parameter to fetch a single team event type by slug.

    <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>

    Access control: The authenticated user must be an accepted member (or admin/owner) of the team.`,
  })
  async getTeamEventTypes(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetTeamEventTypesQuery_2024_06_14
  ): Promise<GetTeamEventTypesOutput> {
    const { eventSlug, hostsLimit, sortCreatedAt } = queryParams;

    if (eventSlug) {
      const eventType = await this.teamsEventTypesService.getTeamEventTypeBySlug(teamId, eventSlug, hostsLimit);

      return {
        status: SUCCESS_STATUS,
        data: await this.outputTeamEventTypesResponsePipe.transform(eventType ? [eventType] : []),
      };
    }

    const eventTypes = await this.teamsEventTypesService.getTeamEventTypes(teamId, sortCreatedAt);

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventTypes),
    };
  }
}
