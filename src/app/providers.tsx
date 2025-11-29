'use client'

import { SessionProvider } from 'next-auth/react'
import { ConfigProvider } from 'antd'
import locale from 'antd/locale/ru_RU'
import '@/lib/dayjs-config' // Инициализируем dayjs с русской локалью

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfigProvider locale={locale}>{children}</ConfigProvider>
    </SessionProvider>
  )
}

