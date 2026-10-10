#!/usr/bin/env tsx

/**
 * Standalone script to create a PBAC-enabled organization with custom roles
 * Run with: npx tsx packages/prisma/seed-pbac-only.ts
 */
import { createPBACOrganization } from "./seed-pbac-organization";

async function main() {
  console.log("🚀 Starting PBAC organization seed...");

  try {
    const result = await createPBACOrganization();

    console.log("\n🎉 PBAC Organization created successfully!");
    console.log("\n📋 Summary:");
    console.log(`Organization: ${result.organization.name} (${result.organization.slug})`);
    console.log(`Custom Roles: ${Object.keys(result.customRoles).length}`);
    console.log(`Users: ${result.users.length}`);
    console.log(`Team: ${result.team?.name || "None"} (${result.team?.slug || "N/A"})`);

    console.log("\n🔐 Login Credentials:");
    result.users.forEach(({ user, role, customRole }) => {
      const roleText = customRole ? `${role} + ${customRole}` : role;
      console.log(`  - ${user.name}: ${user.email} / password (${roleText})`);
    });

    console.log(`\n🌐 Access URLs:`);
    console.log(`Organization: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/org/${result.organization.slug}`);
    if (result.team) {
      console.log(`Team: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/b/${result.team.slug}`);
    }
  } catch (error) {
    console.error("❌ Error creating PBAC organization:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
