export type UserRole = "admin" | "manager" | "worker"
export type UserStatus = "active" | "inactive" | "suspended"
export type ProjectStatus = "active" | "completed" | "on_hold" | "archived"
export type TimesheetStatus = "pending" | "approved" | "rejected" | "flagged"
export type TimesheetSource = "geofence" | "manual" | "kiosk"
export type GeologEventType = "entry" | "exit"
export type AuditAction = "approve" | "reject" | "edit" | "create" | "delete" | "flag"

export interface User {
  id: string
  clerk_id: string
  org_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: UserRole
  employee_code: string
  skills: string[]
  status: UserStatus
  avatar_url: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  org_id: string
  name: string
  client: string
  description: string
  status: ProjectStatus
  default_rate: number
  start_date: string
  end_date: string | null
  address: string
  created_at: string
  updated_at: string
}

export interface Geozone {
  id: string
  project_id: string
  name: string
  description: string
  polygon: [number, number][] // [lng, lat] pairs
  center: [number, number]
  radius_meters: number
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Timesheet {
  id: string
  user_id: string
  project_id: string
  geozone_id: string | null
  date: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number
  source: TimesheetSource
  status: TimesheetStatus
  notes: string
  approved_by: string | null
  approved_at: string | null
  break_minutes: number
  overtime_minutes: number
  created_at: string
  updated_at: string
}

export interface Geolog {
  id: string
  user_id: string
  geozone_id: string
  event_type: GeologEventType
  timestamp: string
  latitude: number
  longitude: number
  accuracy_meters: number
  device_info: string
  created_at: string
}

export interface ProjectAllocation {
  id: string
  user_id: string
  project_id: string
  role_on_project: string
  hourly_rate: number
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface AuditLogEntry {
  id: string
  user_id: string
  action: AuditAction
  entity_type: "timesheet" | "project" | "geozone" | "user" | "allocation"
  entity_id: string
  details: string
  previous_value: string | null
  new_value: string | null
  timestamp: string
}

export interface OrgSettings {
  id: string
  org_name: string
  timezone: string
  location_retention_days: number
  consent_text: string
  auto_clock_out_minutes: number
  require_geozone_match: boolean
}
