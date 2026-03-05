"use client"

import { BrandLogo } from "@/components/brand-logo"

interface AuthCardProps {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-10 flex flex-col items-center gap-3">
        <BrandLogo height={52} className="brightness-0 invert" />
        <p className="text-sm text-white/50">Workforce Time Management</p>
      </div>

      <div className="rounded-2xl bg-card p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 mb-8 text-sm text-muted-foreground">{description}</p>
        {children}
      </div>

      {footer ?? (
        <p className="mt-10 text-center text-xs text-white/30">
          NXT Level Technologies &copy; {new Date().getFullYear()}
        </p>
      )}
    </div>
  )
}
