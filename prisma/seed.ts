import { PrismaClient } from "../generated/prisma"

const prisma = new PrismaClient()

const ORG_ID = process.env.CLERK_ORG_ID ?? "org_default"

async function main() {
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    create: { id: ORG_ID, name: "NXT TIME PULSE" },
    update: { name: "NXT TIME PULSE" },
  })

  const users = [
    { id: "user_seed_1", email: "alice@nxttimepulse.test", firstName: "Alice", lastName: "Smith", role: "worker", employeeCode: "EMP001" },
    { id: "user_seed_2", email: "bob@nxttimepulse.test", firstName: "Bob", lastName: "Jones", role: "worker", employeeCode: "EMP002" },
    { id: "user_seed_3", email: "carol@nxttimepulse.test", firstName: "Carol", lastName: "Williams", role: "manager", employeeCode: "EMP003" },
    { id: "user_seed_4", email: "dave@nxttimepulse.test", firstName: "Dave", lastName: "Brown", role: "worker", employeeCode: "EMP004" },
    { id: "user_seed_5", email: "eve@nxttimepulse.test", firstName: "Eve", lastName: "Davis", role: "worker", employeeCode: "EMP005" },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { ...u, orgId: ORG_ID },
      update: { ...u, orgId: ORG_ID },
    })
  }

  const project = await prisma.project.upsert({
    where: { id: "proj_nxt_location" },
    create: {
      id: "proj_nxt_location",
      orgId: ORG_ID,
      name: "NXT Location",
      client: "NXT TIME PULSE",
      description: "Primary worksite for NXT TIME PULSE",
      status: "active",
      defaultRate: 25,
    },
    update: { orgId: ORG_ID, name: "NXT Location", status: "active" },
  })

  const geozone = await prisma.geozone.upsert({
    where: { id: "geoz_nxt_main" },
    create: {
      id: "geoz_nxt_main",
      projectId: project.id,
      name: "NXT Main Entrance",
      description: "Main building entrance geofence",
      radiusM: 100,
      color: "#4f46e5",
      isActive: true,
    },
    update: {},
  })

  const allUserIds = [...users.map((u) => u.id), "user_3A9oui6sqwfusqdXCLKeNJ1pCPW"]
  for (const uid of allUserIds) {
    await prisma.projectAllocation.upsert({
      where: {
        userId_projectId: { userId: uid, projectId: project.id },
      },
      create: {
        userId: uid,
        projectId: project.id,
        roleOnProject: uid === "user_3A9oui6sqwfusqdXCLKeNJ1pCPW" ? "admin" : (users.find((u) => u.id === uid)?.role === "manager" ? "supervisor" : "field_worker"),
        hourlyRate: 25,
        startDate: new Date("2025-01-01"),
        isActive: true,
      },
      update: { isActive: true },
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  const twoDaysAgo = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)

  const timesheetData = [
    { userId: "user_seed_1", date: today, start: 8, end: 17 },
    { userId: "user_seed_1", date: yesterday, start: 9, end: 17 },
    { userId: "user_seed_2", date: today, start: 7, end: 15 },
    { userId: "user_seed_2", date: yesterday, start: 8, end: 16 },
    { userId: "user_seed_3", date: today, start: 8, end: 18 },
    { userId: "user_seed_4", date: today, start: 6, end: 14 },
    { userId: "user_seed_4", date: yesterday, start: 7, end: 15 },
    { userId: "user_seed_5", date: twoDaysAgo, start: 8, end: 16 },
    { userId: "user_seed_5", date: yesterday, start: 9, end: 17 },
  ]

  const timesheetRows = timesheetData.map((t, i) => {
    const clockIn = new Date(`${t.date}T${String(t.start).padStart(2, "0")}:00:00`)
    const clockOut = new Date(`${t.date}T${String(t.end).padStart(2, "0")}:00:00`)
    const durationMinutes = (t.end - t.start) * 60
    return {
      id: `ts_seed_${i}_${t.userId}_${t.date}`,
      userId: t.userId,
      projectId: project.id,
      geozoneId: geozone.id,
      date: t.date,
      clockIn,
      clockOut,
      durationMinutes,
      source: "geofence",
      status: t.userId === "user_seed_3" ? "approved" : "pending",
    }
  })

  const created = await prisma.timesheet.createMany({
    data: timesheetRows,
    skipDuplicates: true,
  })

  console.log(`Seed complete. Org: ${ORG_ID}`)
  console.log(`  Users: ${users.length}`)
  console.log(`  Project: ${project.name}`)
  console.log(`  Geozone: ${geozone.name}`)
  console.log(`  Timesheets: ${created.count}`)
  if (ORG_ID === "org_default") {
    console.log("\n  To show this data in the dashboard: set CLERK_ORG_ID to your Clerk org ID in .env and re-run: bun run db:seed")
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
