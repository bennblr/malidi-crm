'use client'

import { SessionProvider } from 'next-auth/react'
import DashboardLayout from '@/components/Layout/DashboardLayout'

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SessionProvider>
  )
}

