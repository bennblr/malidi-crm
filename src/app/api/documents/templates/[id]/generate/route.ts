import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateDocument } from '@/lib/document-parser'
import { readTemplate, saveDocument, generateFileName } from '@/lib/file-storage'

/**
 * GET /api/documents/templates/[id]/generate
 * Генерирует документ из шаблона с параметрами из query string
 * 
 * Параметры:
 * - Все параметры из query string будут использованы для заполнения шаблона
 * - cardId (опционально) - ID карточки для автозаполнения данных
 * 
 * Примеры:
 * /api/documents/templates/{id}/generate?client_name=ООО+Рога&organization=ООО+Рога&delivery_address=Москва
 * /api/documents/templates/{id}/generate?cardId={cardId}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')

    // Получаем шаблон
    const template = await prisma.documentTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Если указана карточка, получаем данные из неё
    let cardData = {}
    if (cardId) {
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          priority: true,
          column: true,
        },
      })

      if (card) {
        // Преобразуем данные карточки для шаблона
        cardData = {
          client_name: card.organization,
          organization: card.organization,
          delivery_address: card.deliveryAddress,
          contacts: card.contacts,
          instruments: card.instruments,
          postal_order: card.postalOrder,
          notes: card.notes,
          shipping_date: card.shippingDate
            ? new Date(card.shippingDate).toLocaleDateString('ru-RU')
            : '',
          execution_deadline: card.executionDeadline
            ? new Date(card.executionDeadline).toLocaleDateString('ru-RU')
            : '',
        }
      }
    }

    // Получаем все параметры из query string
    const queryData: Record<string, any> = {}
    searchParams.forEach((value, key) => {
      if (key !== 'cardId') {
        queryData[key] = value
      }
    })

    // Объединяем данные карточки с параметрами query string
    // Параметры query string имеют приоритет над данными карточки
    const templateData = {
      ...cardData,
      ...queryData,
    }

    // Читаем шаблон
    const templateBuffer = await readTemplate(template.filePath)

    // Генерируем документ
    const generatedBuffer = await generateDocument(templateBuffer, templateData)

    // Сохраняем сгенерированный документ
    const fileName = generateFileName(`${template.name}_generated.docx`, 'doc')
    const filePath = await saveDocument(generatedBuffer, fileName)

    // Сохраняем метаданные в БД
    await prisma.generatedDocument.create({
      data: {
        templateId: template.id,
        cardId: cardId || null,
        fileName,
        filePath,
        data: JSON.stringify(templateData),
        createdBy: session.user.id,
      },
    })

    // Возвращаем файл для скачивания
    // Преобразуем Buffer в Uint8Array для NextResponse
    return new NextResponse(new Uint8Array(generatedBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

