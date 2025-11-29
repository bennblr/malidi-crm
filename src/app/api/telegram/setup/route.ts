import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'

export async function POST(request: NextRequest) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' },
        { status: 400 }
      )
    }

    if (!WEBHOOK_URL) {
      return NextResponse.json(
        { success: false, error: 'WEBHOOK_URL or NEXTAUTH_URL is not set' },
        { status: 400 }
      )
    }

    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    const webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    
    console.log(`Setting webhook to: ${webhookUrl}`)
    
    const result = await bot.setWebHook(webhookUrl)
    const webhookInfo = await bot.getWebHookInfo()
    
    return NextResponse.json({
      success: true,
      webhookUrl,
      webhookInfo,
      message: webhookInfo.url === webhookUrl 
        ? 'Webhook успешно настроен!' 
        : 'Webhook URL не совпадает. Проверьте настройки.'
    })
  } catch (error) {
    console.error('Error setting up webhook:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup webhook',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' },
        { status: 400 }
      )
    }

    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    const webhookInfo = await bot.getWebHookInfo()
    
    return NextResponse.json({
      success: true,
      webhookInfo,
      isConfigured: !!webhookInfo.url && webhookInfo.url !== ''
    })
  } catch (error) {
    console.error('Error getting webhook info:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get webhook info',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

