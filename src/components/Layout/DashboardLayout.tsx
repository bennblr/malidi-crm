'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { Layout, Menu, Button } from 'antd'
import { useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { PlusOutlined } from '@ant-design/icons'
import type { MenuInfo } from 'rc-menu/lib/interface'
import CreateCardModal from '@/components/Board/CreateCardModal'
import styles from './DashboardLayout.module.css'

const { Header, Content, Sider } = Layout

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = observer(function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)

  const handleMenuClick = (info: MenuInfo) => {
    const targetPath = info.key as string
    if (targetPath && targetPath !== pathname) {
      // Используем router.push для SPA перехода без перезагрузки страницы
      router.push(targetPath)
    }
  }

  const menuItems = useMemo(
    () => [
      {
        key: '/board',
        label: 'Доска',
      },
      {
        key: '/closed',
        label: 'Закрытые',
      },
      {
        key: '/documents',
        label: 'Документы',
      },
      {
        key: '/settings',
        label: 'Настройки',
      },
      ...(session?.user.role === 'ADMIN'
        ? [
            {
              key: '/users',
              label: 'Пользователи',
            },
          ]
        : []),
    ],
    [session]
  )

  const selectedKey = useMemo(() => {
    if (pathname?.startsWith('/board')) return '/board'
    if (pathname?.startsWith('/closed')) return '/closed'
    if (pathname?.startsWith('/documents')) return '/documents'
    if (pathname?.startsWith('/settings')) return '/settings'
    if (pathname?.startsWith('/users')) return '/users'
    return '/board'
  }, [pathname])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
    router.refresh()
  }

  return (
    <Layout className={styles.layout}>
      <Sider width={200} className={styles.sider}>
        <div className={styles.logo}>CRM Система</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className={styles.menu}
          onClick={(e) => {
            e.domEvent?.preventDefault?.()
            handleMenuClick(e)
          }}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerContent}>
            <span>Добро пожаловать, {session?.user?.email}</span>
            <div className={styles.headerActions}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalVisible(true)}
                size="large"
              >
                Создать заявку
              </Button>
              <Button onClick={handleLogout}>Выйти</Button>
            </div>
          </div>
        </Header>
        <Content className={styles.content}>{children}</Content>
        <CreateCardModal
          open={isCreateModalVisible}
          onCancel={() => setIsCreateModalVisible(false)}
          onSuccess={() => setIsCreateModalVisible(false)}
        />
      </Layout>
    </Layout>
  )
})

export default DashboardLayout

