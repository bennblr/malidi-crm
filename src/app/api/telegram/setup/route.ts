import { NextRequest, NextResponse } from 'next/server'
import { setWebhook, getWebhookInfo } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL

    if (!WEBHOOK_URL) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WEBHOOK_URL or NEXTAUTH_URL is not set',
          note: 'Установите переменную окружения WEBHOOK_URL или NEXTAUTH_URL на Render.com'
        },
        { status: 400 }
      )
    }

    // Проверяем, что URL не localhost
    if (WEBHOOK_URL.includes('localhost') || WEBHOOK_URL.includes('127.0.0.1')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WEBHOOK_URL or NEXTAUTH_URL points to localhost',
          currentValue: WEBHOOK_URL,
          note: 'Для продакшена используйте URL вашего приложения на Render.com (например: https://malidi-crm.onrender.com). Обновите переменные окружения на Render.com.'
        },
        { status: 400 }
      )
    }

    // Убеждаемся, что URL правильный (HTTPS, без слэша в конце)
    let webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    webhookUrl = webhookUrl.replace(/\/+$/, '') // Убираем слэши в конце
    if (!webhookUrl.startsWith('https://')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Webhook URL must use HTTPS',
          webhookUrl,
          note: 'Telegram requires HTTPS for webhooks. Check your WEBHOOK_URL or NEXTAUTH_URL environment variable.'
        },
        { status: 400 }
      )
    }
    
    console.log(`Setting webhook to: ${webhookUrl}`)
    console.log(`WEBHOOK_URL from env: ${WEBHOOK_URL}`)
    console.log(`NEXTAUTH_URL from env: ${process.env.NEXTAUTH_URL}`)
    
    const result = await setWebhook(webhookUrl)
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to set webhook',
          details: result.details,
          webhookUrl,
        },
        { status: 500 }
      )
    }
    
    // Даем Telegram немного времени на обработку
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const webhookInfo = await getWebhookInfo()
    
    const isConfigured = webhookInfo.url === webhookUrl
    
    return NextResponse.json({
      success: true,
      webhookUrl,
      webhookInfo,
      isConfigured,
      message: isConfigured
        ? 'Webhook успешно настроен!' 
        : `Webhook URL не совпадает. Ожидалось: ${webhookUrl}, получено: ${webhookInfo.url || 'пусто'}. Проверьте настройки.`
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
    const webhookInfo = await getWebhookInfo()
    
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

