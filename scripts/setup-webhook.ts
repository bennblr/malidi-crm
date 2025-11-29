import TelegramBot from 'node-telegram-bot-api'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in .env file')
  process.exit(1)
}

if (!WEBHOOK_URL) {
  console.error('WEBHOOK_URL or NEXTAUTH_URL is not set in .env file')
  process.exit(1)
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false })

async function setupWebhook() {
  try {
    const webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    console.log(`Setting webhook to: ${webhookUrl}`)
    
    const result = await bot.setWebHook(webhookUrl)
    console.log('Webhook setup result:', result)
    
    const webhookInfo = await bot.getWebHookInfo()
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

