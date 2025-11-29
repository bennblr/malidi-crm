import { NextRequest, NextResponse } from 'next/server'
import { setWebhook, getWebhookInfo } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL

    if (!WEBHOOK_URL) {
      return NextResponse.json(
        { success: false, error: 'WEBHOOK_URL or NEXTAUTH_URL is not set' },
        { status: 400 }
      )
    }

    const webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    
    console.log(`Setting webhook to: ${webhookUrl}`)
    
    const success = await setWebhook(webhookUrl)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to set webhook' },
        { status: 500 }
      )
    }
    
    const webhookInfo = await getWebhookInfo()
    
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

