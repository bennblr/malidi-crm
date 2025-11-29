import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendReport } from '@/lib/reports'
import dayjs from '@/lib/dayjs-config'

/**
 * API endpoint для отправки отчета вручную
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { chatId, minutes } = body

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId is required' },
        { status: 400 }
      )
    }

    const minutesAgo = minutes || 60 // По умолчанию за последний час
    const endDate = new Date()
    const startDate = dayjs().subtract(minutesAgo, 'minute').toDate()

    const success = await sendReport(chatId, startDate, endDate)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Report sent successfully',
        period: `${minutesAgo} minutes`,
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send report' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

