'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Form, Input, InputNumber, Switch, Button, message, Select } from 'antd'
import { settingsStore } from '@/stores/settingsStore'
import { userStore } from '@/stores/userStore'
import styles from './GeneralSettings.module.css'

function GeneralSettings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    userStore.fetchUsers()
  }, [])

  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      
      // Преобразуем массив ID пользователей в JSON строку
      const responsibleUserIds = values.responsibleUserIds ? JSON.stringify(values.responsibleUserIds) : '[]'
      
      await settingsStore.updateSettings({
        executionDeadlineDefault: String(values.executionDeadlineDefault),
        telegramNotificationsEnabled: String(values.telegramNotificationsEnabled),
        telegramChatId: values.telegramChatId || '',
        responsibleUserIds,
        reportIntervalHour: String(values.reportIntervalHour || 60),
        reportIntervalDay: String(values.reportIntervalDay || 1440),
        reportIntervalWeek: String(values.reportIntervalWeek || 10080),
      })
      message.success('Настройки сохранены')
    } catch (error: any) {
      message.error(error.message || 'Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  // Получаем текущие ответственные пользователи
  const getResponsibleUserIds = () => {
    try {
      const value = settingsStore.settings.responsibleUserIds || '[]'
      return JSON.parse(value)
    } catch {
      return []
    }
  }

  return (
    <div className={styles.generalSettings}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          executionDeadlineDefault:
            parseInt(settingsStore.settings.executionDeadlineDefault || '7') || 7,
          telegramNotificationsEnabled:
            settingsStore.settings.telegramNotificationsEnabled === 'true',
          telegramChatId: settingsStore.settings.telegramChatId || '',
          responsibleUserIds: getResponsibleUserIds(),
          reportIntervalHour:
            parseInt(settingsStore.settings.reportIntervalHour || '60') || 60,
          reportIntervalDay:
            parseInt(settingsStore.settings.reportIntervalDay || '1440') || 1440,
          reportIntervalWeek:
            parseInt(settingsStore.settings.reportIntervalWeek || '10080') || 10080,
        }}
      >
        <Form.Item
          label="Срок исполнения по умолчанию (дни)"
          name="executionDeadlineDefault"
          rules={[
            { required: true, message: 'Введите срок исполнения' },
            { type: 'number', min: 1, message: 'Минимум 1 день' },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Включить уведомления в Telegram"
          name="telegramNotificationsEnabled"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="ID чата Telegram для уведомлений"
          name="telegramChatId"
        >
          <Input placeholder="Введите ID чата" />
        </Form.Item>
        <Form.Item
          label="Ответственные пользователи (ID или username Telegram)"
          name="responsibleUserIds"
          tooltip="Введите ID (число) или username (например: bennblr) пользователей Telegram через запятую. Эти пользователи будут получать уведомления при ошибках обработки заявок. Можно использовать как числовые ID, так и username (без @)."
        >
          <Select
            mode="tags"
            placeholder="Введите ID или username (например: 123456789, bennblr, @username)"
            tokenSeparators={[',']}
            options={[]}
          />
        </Form.Item>
        <Form.Item
          label="Интервал отчетов - каждый час (минуты)"
          name="reportIntervalHour"
          tooltip="Интервал отправки отчетов каждый час (в минутах). По умолчанию: 60"
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Интервал отчетов - каждый день (минуты)"
          name="reportIntervalDay"
          tooltip="Интервал отправки отчетов каждый день (в минутах). По умолчанию: 1440 (24 часа)"
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Интервал отчетов - каждую неделю (минуты)"
          name="reportIntervalWeek"
          tooltip="Интервал отправки отчетов каждую неделю (в минутах). По умолчанию: 10080 (7 дней)"
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSave} loading={loading}>
            Сохранить
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default observer(GeneralSettings)

