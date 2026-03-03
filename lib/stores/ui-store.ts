import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  defaultPageSize: number
  setDefaultPageSize: (size: number) => void

  preferredDateFormat: "relative" | "absolute"
  setPreferredDateFormat: (format: "relative" | "absolute") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      defaultPageSize: 20,
      setDefaultPageSize: (size) => set({ defaultPageSize: size }),

      preferredDateFormat: "relative",
      setPreferredDateFormat: (format) => set({ preferredDateFormat: format }),
    }),
    {
      name: "timepulse-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        defaultPageSize: state.defaultPageSize,
        preferredDateFormat: state.preferredDateFormat,
      }),
    }
  )
)
