import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

async function callTelegramAPI(method: string, params: Record<string, any> = {}): Promise<any> {
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set')
  }

  const url = `${TELEGRAM_API_BASE}${BOT_TOKEN}/${method}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Telegram API error: ${errorData.description || response.statusText}`)
  }

  const data = await response.json()
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`)
  }

  return data.result
}

async function setupWebhook() {
  try {
    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not set in .env file')
      process.exit(1)
    }

    if (!WEBHOOK_URL) {
      console.error('WEBHOOK_URL or NEXTAUTH_URL is not set in .env file')
      process.exit(1)
    }

    const webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    console.log(`Setting webhook to: ${webhookUrl}`)
    
    await callTelegramAPI('setWebhook', { url: webhookUrl })
    console.log('Webhook setup result: OK')
    
    const webhookInfo = await callTelegramAPI('getWebhookInfo')
    console.log('Current webhook info:', JSON.stringify(webhookInfo, null, 2))
    
    if (webhookInfo.url === webhookUrl) {
      console.log('✅ Webhook успешно настроен!')
    } else {
      console.log('⚠️ Webhook URL не совпадает. Проверьте настройки.')
    }
  } catch (error) {
    console.error('Ошибка при настройке webhook:', error)
    process.exit(1)
  }
}

setupWebhook()

