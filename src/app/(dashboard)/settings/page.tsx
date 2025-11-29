'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { settingsStore } from '@/stores/settingsStore'
import Settings from '@/components/Settings/Settings'

function SettingsPage() {
  useEffect(() => {
    settingsStore.fetchPriorities()
    settingsStore.fetchColumns()
    settingsStore.fetchSettings()
  }, [])

  return <Settings />
}

export default observer(SettingsPage)

