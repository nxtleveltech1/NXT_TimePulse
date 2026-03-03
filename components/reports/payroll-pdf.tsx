import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    padding: 40,
    fontSize: 9,
    color: "#111827",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#111827",
  },
  subtitle: {
    fontSize: 10,
    color: "#6B7280",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRowAlt: {
    backgroundColor: "#F9FAFB",
  },
  colDate: { width: "12%" },
  colUser: { width: "20%" },
  colProject: { width: "20%" },
  colIn: { width: "15%" },
  colOut: { width: "15%" },
  colDuration: { width: "10%", textAlign: "right" },
  colStatus: { width: "8%", textAlign: "center" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    fontSize: 8,
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#D1D5DB",
    marginTop: 8,
  },
  totalText: {
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#9CA3AF",
    fontSize: 8,
  },
})

interface TimesheetRow {
  id: string
  date: string
  userName: string
  projectName: string
  clockIn: string
  clockOut: string
  durationMinutes: number
  status: string
}

interface PayrollPdfDocumentProps {
  timesheets: TimesheetRow[]
  from?: string
  to?: string
}

function formatTime(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export function PayrollPdfDocument({ timesheets, from, to }: PayrollPdfDocumentProps) {
  const totalMinutes = timesheets.reduce((sum, t) => sum + t.durationMinutes, 0)
  const dateRange = from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `To ${to}` : "All time"

  return (
    <Document
      title="TimePulse Payroll Report"
      author="TimePulse"
      subject="Payroll Report"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Payroll Report</Text>
          <Text style={styles.subtitle}>
            NXT TIME PULSE · {dateRange} · Generated {new Date().toLocaleDateString("en-AU")}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerText]}>Date</Text>
            <Text style={[styles.colUser, styles.headerText]}>Worker</Text>
            <Text style={[styles.colProject, styles.headerText]}>Project</Text>
            <Text style={[styles.colIn, styles.headerText]}>Clock In</Text>
            <Text style={[styles.colOut, styles.headerText]}>Clock Out</Text>
            <Text style={[styles.colDuration, styles.headerText]}>Duration</Text>
            <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
          </View>

          {timesheets.map((t, i) => (
            <View key={t.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.colDate}>{t.date}</Text>
              <Text style={styles.colUser}>{t.userName}</Text>
              <Text style={styles.colProject}>{t.projectName}</Text>
              <Text style={styles.colIn}>{formatTime(t.clockIn)}</Text>
              <Text style={styles.colOut}>{formatTime(t.clockOut)}</Text>
              <Text style={styles.colDuration}>{formatDuration(t.durationMinutes)}</Text>
              <Text style={styles.colStatus}>{t.status}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.colDate, styles.totalText]} />
            <Text style={[styles.colUser, styles.totalText]} />
            <Text style={[styles.colProject, styles.totalText]}>Total ({timesheets.length} entries)</Text>
            <Text style={[styles.colIn, styles.totalText]} />
            <Text style={[styles.colOut, styles.totalText]} />
            <Text style={[styles.colDuration, styles.totalText]}>{formatDuration(totalMinutes)}</Text>
            <Text style={[styles.colStatus, styles.totalText]} />
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>NXT TIME PULSE — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
