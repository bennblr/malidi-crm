import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')
    const templateId = searchParams.get('templateId')

    const where: any = {}
    if (cardId) {
      where.cardId = cardId
    }
    if (templateId) {
      where.templateId = templateId
    }

    const documents = await prisma.generatedDocument.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        card: {
          select: {
            id: true,
            organization: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      documents.map((doc) => ({
        ...doc,
        data: JSON.parse(doc.data),
        downloadUrl: `/api/documents/download/${doc.id}`,
      }))
    )
  } catch (error) {
    console.error('Error fetching document history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

