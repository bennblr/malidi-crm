'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Tabs, message } from 'antd'
import { settingsStore } from '@/stores/settingsStore'
import PrioritiesSettings from './PrioritiesSettings'
import ColumnsSettings from './ColumnsSettings'
import GeneralSettings from './GeneralSettings'
import styles from './Settings.module.css'

function Settings() {
  return (
    <div className={styles.settings}>
      <h1>Настройки</h1>
      <Tabs
        items={[
          {
            key: 'priorities',
            label: 'Приоритеты',
            children: <PrioritiesSettings />,
          },
          {
            key: 'columns',
            label: 'Колонки',
            children: <ColumnsSettings />,
          },
          {
            key: 'general',
            label: 'Общие настройки',
            children: <GeneralSettings />,
          },
        ]}
      />
    </div>
  )
}

export default observer(Settings)

