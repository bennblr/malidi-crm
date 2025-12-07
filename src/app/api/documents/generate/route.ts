import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateDocument } from '@/lib/document-parser'
import { readTemplate, saveDocument, generateFileName } from '@/lib/file-storage'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, cardId, data } = body

    if (!templateId || !data) {
      return NextResponse.json(
        { error: 'Template ID and data are required' },
        { status: 400 }
      )
    }

    // Получаем шаблон
    const template = await prisma.documentTemplate.findUnique({
      where: { id: templateId },
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

    // Объединяем данные карточки с переданными данными
    const templateData: Record<string, any> = {
      ...cardData,
      ...data,
    }

    // Обрабатываем циклы - если поле цикла не передано, создаем пустой массив
    // Это предотвращает ошибку "Unopened loop"
    const templateFields = template.fields ? (typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields) : []
    templateFields.forEach((field: { name: string; type: string }) => {
      if (field.type === 'loop' && !templateData[field.name]) {
        templateData[field.name] = []
      }
      // Для условий передаем false, если не указано
      if (field.type === 'condition' && templateData[field.name] === undefined) {
        templateData[field.name] = false
      }
    })

    // Читаем шаблон
    const templateBuffer = await readTemplate(template.filePath)

    // Генерируем документ
    const generatedBuffer = await generateDocument(templateBuffer, templateData)

    // Сохраняем сгенерированный документ
    const fileName = generateFileName(`${template.name}_generated.docx`, 'doc')
    const filePath = await saveDocument(generatedBuffer, fileName)

    // Сохраняем метаданные в БД
    const generatedDoc = await prisma.generatedDocument.create({
      data: {
        templateId,
        cardId: cardId || null,
        fileName,
        filePath,
        data: JSON.stringify(templateData),
        createdBy: session.user.id,
      },
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
      },
    })

    return NextResponse.json({
      ...generatedDoc,
      data: JSON.parse(generatedDoc.data),
      downloadUrl: `/api/documents/download/${generatedDoc.id}`,
    })
  } catch (error: any) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

