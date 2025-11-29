import { NextResponse } from 'next/server'
import { initializeWebhook } from '@/lib/webhook-init'

/**
 * API endpoint для инициализации при старте приложения
 * Вызывается автоматически при первом запросе к API
 */
export async function GET() {
  try {
    // Инициализируем webhook при первом запросе
    await initializeWebhook()
    
    return NextResponse.json({
      success: true,
      message: 'Startup initialization completed',
    })
  } catch (error) {
    console.error('Error during startup initialization:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Startup initialization failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

