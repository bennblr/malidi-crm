'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { userStore } from '@/stores/userStore'
import Users from '@/components/Users/Users'

function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/board')
      return
    }
    userStore.fetchUsers()
  }, [session, router])

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return <Users />
}

export default observer(UsersPage)

