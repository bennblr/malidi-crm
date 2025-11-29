'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'

function HomeContent() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') {
      return // Ждем загрузки сессии
    }

    if (status === 'authenticated' && session) {
      // Если пользователь авторизован, редиректим на доску
      router.push('/board')
    } else {
      // Если не авторизован, редиректим на страницу входа
      router.push('/login')
    }
  }, [status, session, router])

  // Показываем загрузку пока проверяем сессию
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Загрузка...</div>
    </div>
  )
}

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  )
}

