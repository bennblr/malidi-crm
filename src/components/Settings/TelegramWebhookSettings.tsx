'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Button, Card, Descriptions, message, Spin, Alert, Tag, Space } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import styles from './TelegramWebhookSettings.module.css'

interface WebhookStatus {
  success: boolean
  bot?: {
    token: string
    info: {
      id: number
      is_bot: boolean
      first_name: string
      username: string
    } | null
  }
  webhook?: {
    configured: boolean
    expectedUrl: string
    actualUrl: string
    pendingUpdates: number
    lastError: string | null
    lastErrorDate: string | null
    maxConnections: number | null
    allowedUpdates: string[] | null
  }
  environment?: {
    webhookUrl: string
    nextAuthUrl: string
  }
  diagnostics?: {
    webhookUrlMatches: boolean
    hasPendingUpdates: boolean
    hasErrors: boolean
    recommendation: string
  }
  error?: string
  details?: string
}

function TelegramWebhookSettings() {
  const [loading, setLoading] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [status, setStatus] = useState<WebhookStatus | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/telegram/status')
      const data = await response.json()
      setStatus(data)
    } catch (error: any) {
      message.error('Ошибка при получении статуса webhook')
      setStatus({
        success: false,
        error: 'Failed to fetch status',
        details: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const setupWebhook = async () => {
    try {
      setSettingUp(true)
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success && data.isConfigured) {
        message.success(data.message || 'Webhook успешно настроен!')
        // Обновляем статус после настройки
        await fetchStatus()
      } else if (data.success && !data.isConfigured) {
        message.warning(data.message || 'Webhook настроен, но URL не совпадает')
        await fetchStatus()
      } else {
        const errorMsg = data.error || 'Ошибка при настройке webhook'
        const details = data.details ? ` Детали: ${JSON.stringify(data.details)}` : ''
        const note = data.note ? ` ${data.note}` : ''
        message.error(errorMsg + details + note)
        await fetchStatus() // Обновляем статус, чтобы показать текущее состояние
      }
    } catch (error: any) {
      message.error('Ошибка при настройке webhook: ' + (error.message || 'Неизвестная ошибка'))
      await fetchStatus()
    } finally {
      setSettingUp(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading && !status) {
    return (
      <div className={styles.webhookSettings}>
        <Spin size="large" />
      </div>
    )
  }

  if (!status || !status.success) {
    return (
      <div className={styles.webhookSettings}>
        <Alert
          message="Ошибка при получении статуса webhook"
          description={status?.error || status?.details || 'Неизвестная ошибка'}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchStatus}>
              Повторить
            </Button>
          }
        />
      </div>
    )
  }

  const { bot, webhook, environment, diagnostics } = status

  return (
    <div className={styles.webhookSettings}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <span>Статус Telegram Webhook</span>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchStatus}
                loading={loading}
                size="small"
              >
                Обновить
              </Button>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={setupWebhook}
              loading={settingUp}
              disabled={
                webhook?.configured || 
                (environment && (environment.webhookUrl?.includes('localhost') || environment.nextAuthUrl?.includes('localhost')))
              }
            >
              Настроить Webhook
            </Button>
          }
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Статус">
              {webhook?.configured ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Настроен
                </Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="error">
                  Не настроен
                </Tag>
              )}
            </Descriptions.Item>
            
            {bot?.info && (
              <>
                <Descriptions.Item label="Бот">
                  {bot.info.first_name} (@{bot.info.username})
                </Descriptions.Item>
                <Descriptions.Item label="ID бота">
                  {bot.info.id}
                </Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Ожидаемый URL">
              <code>{webhook?.expectedUrl || 'не указан'}</code>
            </Descriptions.Item>
            
            <Descriptions.Item label="Текущий URL">
              <code>{webhook?.actualUrl || 'не настроен'}</code>
            </Descriptions.Item>

            {environment && (
              <>
                <Descriptions.Item label="WEBHOOK_URL">
                  <code>{environment.webhookUrl || 'не установлен'}</code>
                </Descriptions.Item>
                <Descriptions.Item label="NEXTAUTH_URL">
                  <code>{environment.nextAuthUrl || 'не установлен'}</code>
                </Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Ожидающие обновления">
              {webhook?.pendingUpdates || 0}
              {webhook && webhook.pendingUpdates > 0 && (
                <Tag color="orange" style={{ marginLeft: 8 }}>
                  Есть необработанные сообщения
                </Tag>
              )}
            </Descriptions.Item>

            {webhook?.lastError && (
              <>
                <Descriptions.Item label="Последняя ошибка">
                  <Alert
                    message={webhook.lastError}
                    type="error"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                </Descriptions.Item>
                {webhook.lastErrorDate && (
                  <Descriptions.Item label="Дата ошибки">
                    {new Date(webhook.lastErrorDate).toLocaleString('ru-RU')}
                  </Descriptions.Item>
                )}
              </>
            )}

            {webhook?.maxConnections && (
              <Descriptions.Item label="Максимум соединений">
                {webhook.maxConnections}
              </Descriptions.Item>
            )}
          </Descriptions>

          {diagnostics?.recommendation && (
            <Alert
              message="Рекомендация"
              description={diagnostics.recommendation}
              type={webhook?.configured ? 'success' : 'warning'}
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {environment && (environment.webhookUrl?.includes('localhost') || environment.nextAuthUrl?.includes('localhost')) && (
            <Alert
              message="Неправильная конфигурация переменных окружения"
              description={
                <div>
                  <p>Переменные окружения указывают на localhost, что не работает для продакшена.</p>
                  <p><strong>Текущие значения:</strong></p>
                  <ul>
                    {environment.webhookUrl && <li>WEBHOOK_URL: <code>{environment.webhookUrl}</code></li>}
                    {environment.nextAuthUrl && <li>NEXTAUTH_URL: <code>{environment.nextAuthUrl}</code></li>}
                  </ul>
                  <p><strong>Решение:</strong> Обновите переменные окружения на Render.com:</p>
                  <ul>
                    <li>NEXTAUTH_URL = <code>https://malidi-crm.onrender.com</code></li>
                    <li>WEBHOOK_URL = <code>https://malidi-crm.onrender.com</code> (опционально)</li>
                  </ul>
                  <p>После обновления перезапустите приложение и попробуйте настроить webhook снова.</p>
                </div>
              }
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {!webhook?.configured && !environment?.webhookUrl?.includes('localhost') && !environment?.nextAuthUrl?.includes('localhost') && (
            <Alert
              message="Webhook не настроен"
              description="Нажмите кнопку 'Настроить Webhook' для автоматической настройки. Убедитесь, что переменные окружения NEXTAUTH_URL или WEBHOOK_URL установлены правильно."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {webhook?.configured && webhook.pendingUpdates > 0 && (
            <Alert
              message="Есть ожидающие обновления"
              description={`Telegram пытался отправить ${webhook.pendingUpdates} сообщений, но webhook не был настроен. После настройки эти сообщения будут обработаны автоматически.`}
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        <Card title="Информация">
          <p>
            <strong>Webhook</strong> — это механизм, который позволяет Telegram отправлять обновления
            (сообщения, события) напрямую на ваш сервер вместо того, чтобы бот постоянно опрашивал сервер.
          </p>
          <p>
            После настройки webhook все сообщения из Telegram чата будут автоматически обрабатываться
            и создавать заявки в системе.
          </p>
          <p>
            <strong>Важно:</strong> Убедитесь, что переменные окружения <code>NEXTAUTH_URL</code> или{' '}
            <code>WEBHOOK_URL</code> установлены правильно и указывают на ваш домен (например:{' '}
            <code>https://malidi-crm.onrender.com</code>).
          </p>
        </Card>
      </Space>
    </div>
  )
}

export default observer(TelegramWebhookSettings)

