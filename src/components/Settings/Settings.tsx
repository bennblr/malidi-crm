'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Tabs, message } from 'antd'
import { settingsStore } from '@/stores/settingsStore'
import PrioritiesSettings from './PrioritiesSettings'
import ColumnsSettings from './ColumnsSettings'
import GeneralSettings from './GeneralSettings'
import TelegramWebhookSettings from './TelegramWebhookSettings'
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
          {
            key: 'telegram-webhook',
            label: 'Telegram Webhook',
            children: <TelegramWebhookSettings />,
          },
        ]}
      />
    </div>
  )
}

export default observer(Settings)

