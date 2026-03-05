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
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-2">
        <BrandLogo height={48} className="brightness-0 invert" />
        <p className="text-sm text-white/50">Workforce Time Management</p>
      </div>

      <div className="rounded-[20px] bg-card p-6 shadow-xl">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>
        {children}
      </div>

      {footer ?? (
        <p className="mt-8 text-center text-xs text-white/35">
          NXT Level Technologies &copy; {new Date().getFullYear()}
        </p>
      )}
    </div>
  )
}
