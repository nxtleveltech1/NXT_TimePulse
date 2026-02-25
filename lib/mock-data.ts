import type {
  User,
  Project,
  Geozone,
  Timesheet,
  Geolog,
  ProjectAllocation,
  AuditLogEntry,
  OrgSettings,
} from "./types"

// --------------- Organization Settings ---------------
export const orgSettings: OrgSettings = {
  id: "org_1",
  org_name: "Apex Construction Group",
  timezone: "America/New_York",
  location_retention_days: 90,
  consent_text:
    "By using FieldPulse, you consent to location tracking during work hours for timesheet verification purposes.",
  auto_clock_out_minutes: 480,
  require_geozone_match: true,
}

// --------------- Users ---------------
export const users: User[] = [
  {
    id: "usr_1",
    clerk_id: "clerk_admin_001",
    org_id: "org_1",
    email: "sarah.chen@apexcg.com",
    first_name: "Sarah",
    last_name: "Chen",
    phone: "+1-555-0101",
    role: "admin",
    employee_code: "ACG-001",
    skills: ["Project Management", "Budgeting", "Scheduling"],
    status: "active",
    avatar_url: "",
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2025-12-01T10:30:00Z",
  },
  {
    id: "usr_2",
    clerk_id: "clerk_mgr_001",
    org_id: "org_1",
    email: "james.rivera@apexcg.com",
    first_name: "James",
    last_name: "Rivera",
    phone: "+1-555-0102",
    role: "manager",
    employee_code: "ACG-002",
    skills: ["Site Management", "Safety Compliance", "Team Lead"],
    status: "active",
    avatar_url: "",
    created_at: "2024-02-01T09:00:00Z",
    updated_at: "2025-11-28T14:00:00Z",
  },
  {
    id: "usr_3",
    clerk_id: "clerk_mgr_002",
    org_id: "org_1",
    email: "priya.sharma@apexcg.com",
    first_name: "Priya",
    last_name: "Sharma",
    phone: "+1-555-0103",
    role: "manager",
    employee_code: "ACG-003",
    skills: ["Engineering", "Quality Control", "Reporting"],
    status: "active",
    avatar_url: "",
    created_at: "2024-03-10T09:00:00Z",
    updated_at: "2025-12-02T08:45:00Z",
  },
  {
    id: "usr_4",
    clerk_id: "clerk_wkr_001",
    org_id: "org_1",
    email: "mike.johnson@apexcg.com",
    first_name: "Mike",
    last_name: "Johnson",
    phone: "+1-555-0104",
    role: "worker",
    employee_code: "ACG-004",
    skills: ["Concrete", "Framing", "Heavy Equipment"],
    status: "active",
    avatar_url: "",
    created_at: "2024-04-01T09:00:00Z",
    updated_at: "2025-11-30T16:00:00Z",
  },
  {
    id: "usr_5",
    clerk_id: "clerk_wkr_002",
    org_id: "org_1",
    email: "ana.martinez@apexcg.com",
    first_name: "Ana",
    last_name: "Martinez",
    phone: "+1-555-0105",
    role: "worker",
    employee_code: "ACG-005",
    skills: ["Electrical", "Wiring", "Panel Installation"],
    status: "active",
    avatar_url: "",
    created_at: "2024-04-15T09:00:00Z",
    updated_at: "2025-12-01T07:30:00Z",
  },
  {
    id: "usr_6",
    clerk_id: "clerk_wkr_003",
    org_id: "org_1",
    email: "david.okafor@apexcg.com",
    first_name: "David",
    last_name: "Okafor",
    phone: "+1-555-0106",
    role: "worker",
    employee_code: "ACG-006",
    skills: ["Plumbing", "HVAC", "Welding"],
    status: "active",
    avatar_url: "",
    created_at: "2024-05-01T09:00:00Z",
    updated_at: "2025-11-29T15:20:00Z",
  },
  {
    id: "usr_7",
    clerk_id: "clerk_wkr_004",
    org_id: "org_1",
    email: "lisa.wong@apexcg.com",
    first_name: "Lisa",
    last_name: "Wong",
    phone: "+1-555-0107",
    role: "worker",
    employee_code: "ACG-007",
    skills: ["Carpentry", "Finishing", "Drywall"],
    status: "active",
    avatar_url: "",
    created_at: "2024-06-01T09:00:00Z",
    updated_at: "2025-12-02T11:00:00Z",
  },
  {
    id: "usr_8",
    clerk_id: "clerk_wkr_005",
    org_id: "org_1",
    email: "tom.baker@apexcg.com",
    first_name: "Tom",
    last_name: "Baker",
    phone: "+1-555-0108",
    role: "worker",
    employee_code: "ACG-008",
    skills: ["Masonry", "Landscaping"],
    status: "inactive",
    avatar_url: "",
    created_at: "2024-07-01T09:00:00Z",
    updated_at: "2025-10-15T09:00:00Z",
  },
  {
    id: "usr_9",
    clerk_id: "clerk_wkr_006",
    org_id: "org_1",
    email: "rachel.kim@apexcg.com",
    first_name: "Rachel",
    last_name: "Kim",
    phone: "+1-555-0109",
    role: "worker",
    employee_code: "ACG-009",
    skills: ["Painting", "Coating", "Surface Prep"],
    status: "active",
    avatar_url: "",
    created_at: "2024-08-01T09:00:00Z",
    updated_at: "2025-12-01T13:45:00Z",
  },
]

// --------------- Projects ---------------
export const projects: Project[] = [
  {
    id: "prj_1",
    org_id: "org_1",
    name: "Downtown Office Tower",
    client: "Metro Development Corp",
    description: "32-story office tower construction in the downtown financial district. Full build from foundation to finishing.",
    status: "active",
    default_rate: 85,
    start_date: "2025-01-15",
    end_date: "2026-06-30",
    address: "250 Financial Ave, New York, NY 10005",
    created_at: "2024-12-01T10:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "prj_2",
    org_id: "org_1",
    name: "Harbor Bridge Renovation",
    client: "City Transit Authority",
    description: "Major structural renovation of the Harbor Bridge including deck replacement and seismic reinforcement.",
    status: "active",
    default_rate: 95,
    start_date: "2025-03-01",
    end_date: "2026-03-31",
    address: "Harbor Bridge, Brooklyn, NY 11201",
    created_at: "2025-01-10T09:00:00Z",
    updated_at: "2025-11-28T14:00:00Z",
  },
  {
    id: "prj_3",
    org_id: "org_1",
    name: "Riverside Condos Phase 2",
    client: "Riverside Living LLC",
    description: "Second phase of luxury waterfront condominium complex. 4 buildings, 120 units total.",
    status: "active",
    default_rate: 78,
    start_date: "2025-06-01",
    end_date: "2026-12-31",
    address: "100 Riverside Dr, Jersey City, NJ 07310",
    created_at: "2025-04-15T09:00:00Z",
    updated_at: "2025-12-02T08:00:00Z",
  },
  {
    id: "prj_4",
    org_id: "org_1",
    name: "Central Park Pavilion",
    client: "NYC Parks Department",
    description: "New community pavilion and event space within Central Park. Green building certified.",
    status: "active",
    default_rate: 72,
    start_date: "2025-09-01",
    end_date: "2026-04-30",
    address: "Central Park West, New York, NY 10024",
    created_at: "2025-07-20T09:00:00Z",
    updated_at: "2025-11-30T16:00:00Z",
  },
  {
    id: "prj_5",
    org_id: "org_1",
    name: "Industrial Warehouse Retrofit",
    client: "GreenTech Logistics",
    description: "Converting 50,000 sq ft warehouse into modern fulfillment center with automated systems.",
    status: "on_hold",
    default_rate: 68,
    start_date: "2025-04-01",
    end_date: null,
    address: "450 Industrial Blvd, Newark, NJ 07114",
    created_at: "2025-02-10T09:00:00Z",
    updated_at: "2025-10-15T09:00:00Z",
  },
  {
    id: "prj_6",
    org_id: "org_1",
    name: "Midtown Hotel Renovation",
    client: "Prestige Hospitality Group",
    description: "Full interior renovation of a 200-room boutique hotel. Includes lobby, restaurant, and all guest rooms.",
    status: "completed",
    default_rate: 82,
    start_date: "2024-06-01",
    end_date: "2025-08-31",
    address: "789 Madison Ave, New York, NY 10065",
    created_at: "2024-04-01T09:00:00Z",
    updated_at: "2025-09-01T10:00:00Z",
  },
  {
    id: "prj_7",
    org_id: "org_1",
    name: "Queens School Complex",
    client: "NYC Department of Education",
    description: "New K-8 school campus with 3 buildings, athletic facilities, and auditorium.",
    status: "active",
    default_rate: 75,
    start_date: "2025-08-15",
    end_date: "2027-01-31",
    address: "55 School Lane, Queens, NY 11375",
    created_at: "2025-06-01T09:00:00Z",
    updated_at: "2025-12-01T11:00:00Z",
  },
]

// --------------- Geozones ---------------
// Polygons centered around NYC area
export const geozones: Geozone[] = [
  {
    id: "gz_1",
    project_id: "prj_1",
    name: "Downtown Tower - Main Site",
    description: "Primary construction zone for the office tower",
    polygon: [
      [-74.0095, 40.7075],
      [-74.0075, 40.7075],
      [-74.0075, 40.7095],
      [-74.0095, 40.7095],
      [-74.0095, 40.7075],
    ],
    center: [-74.0085, 40.7085],
    radius_meters: 150,
    color: "#4f46e5",
    is_active: true,
    created_at: "2025-01-10T09:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "gz_2",
    project_id: "prj_1",
    name: "Downtown Tower - Staging Area",
    description: "Material staging and equipment storage area",
    polygon: [
      [-74.0110, 40.7065],
      [-74.0095, 40.7065],
      [-74.0095, 40.7078],
      [-74.0110, 40.7078],
      [-74.0110, 40.7065],
    ],
    center: [-74.01025, 40.70715],
    radius_meters: 100,
    color: "#6366f1",
    is_active: true,
    created_at: "2025-01-10T09:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "gz_3",
    project_id: "prj_2",
    name: "Harbor Bridge - North Approach",
    description: "Bridge renovation work zone on the north side",
    polygon: [
      [-73.9960, 40.7010],
      [-73.9935, 40.7010],
      [-73.9935, 40.7030],
      [-73.9960, 40.7030],
      [-73.9960, 40.7010],
    ],
    center: [-73.99475, 40.702],
    radius_meters: 200,
    color: "#0891b2",
    is_active: true,
    created_at: "2025-03-01T09:00:00Z",
    updated_at: "2025-11-28T14:00:00Z",
  },
  {
    id: "gz_4",
    project_id: "prj_3",
    name: "Riverside Condos - Building A & B",
    description: "Construction zone for the first two condo buildings",
    polygon: [
      [-74.0400, 40.7190],
      [-74.0375, 40.7190],
      [-74.0375, 40.7210],
      [-74.0400, 40.7210],
      [-74.0400, 40.7190],
    ],
    center: [-74.03875, 40.72],
    radius_meters: 180,
    color: "#059669",
    is_active: true,
    created_at: "2025-06-01T09:00:00Z",
    updated_at: "2025-12-02T08:00:00Z",
  },
  {
    id: "gz_5",
    project_id: "prj_4",
    name: "Central Park Pavilion Site",
    description: "Pavilion construction area within Central Park",
    polygon: [
      [-73.9720, 40.7810],
      [-73.9700, 40.7810],
      [-73.9700, 40.7825],
      [-73.9720, 40.7825],
      [-73.9720, 40.7810],
    ],
    center: [-73.971, 40.78175],
    radius_meters: 120,
    color: "#d97706",
    is_active: true,
    created_at: "2025-09-01T09:00:00Z",
    updated_at: "2025-11-30T16:00:00Z",
  },
  {
    id: "gz_6",
    project_id: "prj_5",
    name: "Warehouse Retrofit Zone",
    description: "Industrial warehouse conversion work area",
    polygon: [
      [-74.1690, 40.7240],
      [-74.1660, 40.7240],
      [-74.1660, 40.7260],
      [-74.1690, 40.7260],
      [-74.1690, 40.7240],
    ],
    center: [-74.1675, 40.725],
    radius_meters: 200,
    color: "#7c3aed",
    is_active: false,
    created_at: "2025-04-01T09:00:00Z",
    updated_at: "2025-10-15T09:00:00Z",
  },
  {
    id: "gz_7",
    project_id: "prj_7",
    name: "Queens School - Main Campus",
    description: "Primary construction zone for the school complex",
    polygon: [
      [-73.8450, 40.7210],
      [-73.8420, 40.7210],
      [-73.8420, 40.7235],
      [-73.8450, 40.7235],
      [-73.8450, 40.7210],
    ],
    center: [-73.8435, 40.72225],
    radius_meters: 250,
    color: "#e11d48",
    is_active: true,
    created_at: "2025-08-15T09:00:00Z",
    updated_at: "2025-12-01T11:00:00Z",
  },
]

// --------------- Project Allocations ---------------
export const allocations: ProjectAllocation[] = [
  { id: "alloc_1", user_id: "usr_2", project_id: "prj_1", role_on_project: "Site Manager", hourly_rate: 95, start_date: "2025-01-15", end_date: null, is_active: true, created_at: "2025-01-15T09:00:00Z" },
  { id: "alloc_2", user_id: "usr_4", project_id: "prj_1", role_on_project: "Concrete Specialist", hourly_rate: 85, start_date: "2025-01-20", end_date: null, is_active: true, created_at: "2025-01-20T09:00:00Z" },
  { id: "alloc_3", user_id: "usr_5", project_id: "prj_1", role_on_project: "Electrician", hourly_rate: 88, start_date: "2025-03-01", end_date: null, is_active: true, created_at: "2025-03-01T09:00:00Z" },
  { id: "alloc_4", user_id: "usr_3", project_id: "prj_2", role_on_project: "QC Engineer", hourly_rate: 92, start_date: "2025-03-01", end_date: null, is_active: true, created_at: "2025-03-01T09:00:00Z" },
  { id: "alloc_5", user_id: "usr_6", project_id: "prj_2", role_on_project: "Welder", hourly_rate: 90, start_date: "2025-03-15", end_date: null, is_active: true, created_at: "2025-03-15T09:00:00Z" },
  { id: "alloc_6", user_id: "usr_7", project_id: "prj_3", role_on_project: "Finish Carpenter", hourly_rate: 78, start_date: "2025-06-01", end_date: null, is_active: true, created_at: "2025-06-01T09:00:00Z" },
  { id: "alloc_7", user_id: "usr_9", project_id: "prj_3", role_on_project: "Painter", hourly_rate: 72, start_date: "2025-06-15", end_date: null, is_active: true, created_at: "2025-06-15T09:00:00Z" },
  { id: "alloc_8", user_id: "usr_4", project_id: "prj_4", role_on_project: "Foundation Work", hourly_rate: 82, start_date: "2025-09-01", end_date: null, is_active: true, created_at: "2025-09-01T09:00:00Z" },
  { id: "alloc_9", user_id: "usr_7", project_id: "prj_4", role_on_project: "Carpenter", hourly_rate: 75, start_date: "2025-09-15", end_date: null, is_active: true, created_at: "2025-09-15T09:00:00Z" },
  { id: "alloc_10", user_id: "usr_2", project_id: "prj_7", role_on_project: "Site Manager", hourly_rate: 95, start_date: "2025-08-15", end_date: null, is_active: true, created_at: "2025-08-15T09:00:00Z" },
  { id: "alloc_11", user_id: "usr_5", project_id: "prj_7", role_on_project: "Electrician", hourly_rate: 85, start_date: "2025-09-01", end_date: null, is_active: true, created_at: "2025-09-01T09:00:00Z" },
  { id: "alloc_12", user_id: "usr_6", project_id: "prj_3", role_on_project: "Plumber", hourly_rate: 80, start_date: "2025-07-01", end_date: null, is_active: true, created_at: "2025-07-01T09:00:00Z" },
]

// --------------- Timesheets ---------------
function generateTimesheets(): Timesheet[] {
  const sheets: Timesheet[] = []
  const workerProjects: { userId: string; projectId: string; geozoneId: string }[] = [
    { userId: "usr_2", projectId: "prj_1", geozoneId: "gz_1" },
    { userId: "usr_4", projectId: "prj_1", geozoneId: "gz_1" },
    { userId: "usr_5", projectId: "prj_1", geozoneId: "gz_1" },
    { userId: "usr_3", projectId: "prj_2", geozoneId: "gz_3" },
    { userId: "usr_6", projectId: "prj_2", geozoneId: "gz_3" },
    { userId: "usr_7", projectId: "prj_3", geozoneId: "gz_4" },
    { userId: "usr_9", projectId: "prj_3", geozoneId: "gz_4" },
    { userId: "usr_4", projectId: "prj_4", geozoneId: "gz_5" },
    { userId: "usr_2", projectId: "prj_7", geozoneId: "gz_7" },
    { userId: "usr_5", projectId: "prj_7", geozoneId: "gz_7" },
  ]

  const statuses: TimesheetStatus[] = ["approved", "approved", "approved", "pending", "pending", "rejected", "flagged"]
  const sources: TimesheetSource[] = ["geofence", "geofence", "geofence", "manual", "kiosk"]

  let counter = 0
  // Generate timesheets for 5 weeks
  for (let weekOffset = 0; weekOffset < 5; weekOffset++) {
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      // Mon-Fri
      const date = new Date(2025, 11, 1) // Dec 1, 2025
      date.setDate(date.getDate() - weekOffset * 7 - dayOffset)
      const dateStr = date.toISOString().split("T")[0]

      for (const wp of workerProjects) {
        // Not every worker works every day
        if (Math.random() > 0.75) continue
        counter++

        const clockInHour = 6 + Math.floor(Math.random() * 2) // 6-7 AM
        const clockInMin = Math.floor(Math.random() * 60)
        const durationHours = 7 + Math.random() * 3 // 7-10 hours
        const durationMinutes = Math.round(durationHours * 60)
        const breakMin = Math.random() > 0.5 ? 30 : 60
        const overtime = durationMinutes > 480 ? durationMinutes - 480 : 0

        const clockIn = `${dateStr}T${String(clockInHour).padStart(2, "0")}:${String(clockInMin).padStart(2, "0")}:00Z`
        const clockOutDate = new Date(clockIn)
        clockOutDate.setMinutes(clockOutDate.getMinutes() + durationMinutes)
        const clockOut = clockOutDate.toISOString()

        const status = statuses[counter % statuses.length]
        const source = sources[counter % sources.length]

        sheets.push({
          id: `ts_${counter}`,
          user_id: wp.userId,
          project_id: wp.projectId,
          geozone_id: wp.geozoneId,
          date: dateStr,
          clock_in: clockIn,
          clock_out: clockOut,
          duration_minutes: durationMinutes,
          source,
          status,
          notes: counter % 5 === 0 ? "Worked overtime to meet deadline" : "",
          approved_by: status === "approved" ? "usr_1" : null,
          approved_at: status === "approved" ? `${dateStr}T18:00:00Z` : null,
          break_minutes: breakMin,
          overtime_minutes: overtime,
          created_at: clockIn,
          updated_at: clockOut,
        })
      }
    }
  }

  return sheets.sort((a, b) => b.date.localeCompare(a.date))
}

export const timesheets: Timesheet[] = generateTimesheets()

// --------------- Geologs ---------------
function generateGeologs(): Geolog[] {
  const logs: Geolog[] = []
  let counter = 0
  const devices = ["iPhone 15 Pro", "Samsung Galaxy S24", "iPhone 14", "Pixel 8", "Samsung Galaxy A54"]

  for (const ts of timesheets.slice(0, 40)) {
    const gz = geozones.find((g) => g.id === ts.geozone_id)
    if (!gz) continue
    counter++

    // Entry event
    logs.push({
      id: `gl_${counter}_in`,
      user_id: ts.user_id,
      geozone_id: ts.geozone_id!,
      event_type: "entry",
      timestamp: ts.clock_in,
      latitude: gz.center[1] + (Math.random() - 0.5) * 0.001,
      longitude: gz.center[0] + (Math.random() - 0.5) * 0.001,
      accuracy_meters: 5 + Math.random() * 15,
      device_info: devices[counter % devices.length],
      created_at: ts.clock_in,
    })

    // Exit event
    if (ts.clock_out) {
      logs.push({
        id: `gl_${counter}_out`,
        user_id: ts.user_id,
        geozone_id: ts.geozone_id!,
        event_type: "exit",
        timestamp: ts.clock_out,
        latitude: gz.center[1] + (Math.random() - 0.5) * 0.001,
        longitude: gz.center[0] + (Math.random() - 0.5) * 0.001,
        accuracy_meters: 5 + Math.random() * 15,
        device_info: devices[counter % devices.length],
        created_at: ts.clock_out,
      })
    }
  }

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export const geologs: Geolog[] = generateGeologs()

// --------------- Audit Log ---------------
export const auditLog: AuditLogEntry[] = [
  { id: "aud_1", user_id: "usr_1", action: "approve", entity_type: "timesheet", entity_id: "ts_1", details: "Approved timesheet for James Rivera", previous_value: "pending", new_value: "approved", timestamp: "2025-12-01T18:00:00Z" },
  { id: "aud_2", user_id: "usr_1", action: "approve", entity_type: "timesheet", entity_id: "ts_2", details: "Approved timesheet for Mike Johnson", previous_value: "pending", new_value: "approved", timestamp: "2025-12-01T18:01:00Z" },
  { id: "aud_3", user_id: "usr_1", action: "reject", entity_type: "timesheet", entity_id: "ts_6", details: "Rejected timesheet - hours mismatch with geolog", previous_value: "pending", new_value: "rejected", timestamp: "2025-11-30T17:00:00Z" },
  { id: "aud_4", user_id: "usr_1", action: "create", entity_type: "project", entity_id: "prj_7", details: "Created Queens School Complex project", previous_value: null, new_value: "active", timestamp: "2025-06-01T09:00:00Z" },
  { id: "aud_5", user_id: "usr_2", action: "edit", entity_type: "timesheet", entity_id: "ts_10", details: "Edited clock-out time from 16:00 to 17:30", previous_value: "16:00", new_value: "17:30", timestamp: "2025-11-29T18:00:00Z" },
  { id: "aud_6", user_id: "usr_1", action: "create", entity_type: "geozone", entity_id: "gz_7", details: "Created Queens School - Main Campus geozone", previous_value: null, new_value: "active", timestamp: "2025-08-15T09:30:00Z" },
  { id: "aud_7", user_id: "usr_1", action: "flag", entity_type: "timesheet", entity_id: "ts_15", details: "Flagged - location outside geozone boundary", previous_value: "pending", new_value: "flagged", timestamp: "2025-11-28T16:00:00Z" },
  { id: "aud_8", user_id: "usr_3", action: "approve", entity_type: "timesheet", entity_id: "ts_20", details: "Approved timesheet for David Okafor", previous_value: "pending", new_value: "approved", timestamp: "2025-11-27T17:30:00Z" },
]

// --------------- Helper Functions ---------------
export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id)
}

export function getGeozoneById(id: string): Geozone | undefined {
  return geozones.find((g) => g.id === id)
}

export function getTimesheetsForUser(userId: string): Timesheet[] {
  return timesheets.filter((t) => t.user_id === userId)
}

export function getTimesheetsForProject(projectId: string): Timesheet[] {
  return timesheets.filter((t) => t.project_id === projectId)
}

export function getAllocationsForUser(userId: string): ProjectAllocation[] {
  return allocations.filter((a) => a.user_id === userId)
}

export function getAllocationsForProject(projectId: string): ProjectAllocation[] {
  return allocations.filter((a) => a.project_id === projectId)
}

export function getGeozonesForProject(projectId: string): Geozone[] {
  return geozones.filter((g) => g.project_id === projectId)
}

export function getGeologsForUser(userId: string): Geolog[] {
  return geologs.filter((g) => g.user_id === userId)
}

export function getUserFullName(user: User): string {
  return `${user.first_name} ${user.last_name}`
}

export function getTotalHoursForUser(userId: string): number {
  return getTimesheetsForUser(userId).reduce((sum, t) => sum + t.duration_minutes, 0) / 60
}

export function getTotalHoursForProject(projectId: string): number {
  return getTimesheetsForProject(projectId).reduce((sum, t) => sum + t.duration_minutes, 0) / 60
}

export function getActiveWorkerCount(): number {
  return users.filter((u) => u.role === "worker" && u.status === "active").length
}

export function getPendingTimesheetCount(): number {
  return timesheets.filter((t) => t.status === "pending").length
}

export function getActiveProjectCount(): number {
  return projects.filter((p) => p.status === "active").length
}

export function getThisWeekHours(): number {
  const now = new Date("2025-12-02")
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 5) // Saturday

  return timesheets
    .filter((t) => {
      const d = new Date(t.date)
      return d >= weekStart && d < weekEnd
    })
    .reduce((sum, t) => sum + t.duration_minutes, 0) / 60
}
