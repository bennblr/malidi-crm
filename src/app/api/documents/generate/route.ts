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

    // Обрабатываем поля шаблона (циклы отключены)
    const templateFields = template.fields ? (typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields) : []
    templateFields.forEach((field: { name: string; type: string }) => {
      // Удаляем данные циклов (циклы отключены)
      if (field.type === 'loop') {
        delete templateData[field.name]
        return
      }
      // Для условий передаем false, если не указано
      if (field.type === 'condition' && templateData[field.name] === undefined) {
        templateData[field.name] = false
      }
    })

    // Читаем шаблон
    console.log('Reading template from:', template.filePath)
    let templateBuffer: Buffer
    try {
      templateBuffer = await readTemplate(template.filePath)
      console.log('Template read successfully, size:', templateBuffer.length)
    } catch (error: any) {
      console.error('Error reading template file:', error)
      throw new Error(`Не удалось прочитать файл шаблона: ${error.message}`)
    }

    // Генерируем документ
    console.log('Generating document with data:', JSON.stringify(templateData, null, 2))
    let generatedBuffer: Buffer
    try {
      generatedBuffer = await generateDocument(templateBuffer, templateData)
      console.log('Document generated successfully, size:', generatedBuffer.length)
    } catch (error: any) {
      console.error('Error generating document:', error)
      throw error
    }

    // Сохраняем сгенерированный документ
    const fileName = generateFileName(`${template.name}_generated.docx`, 'doc')
    console.log('Saving document with filename:', fileName)
    let filePath: string
    try {
      filePath = await saveDocument(generatedBuffer, fileName)
      console.log('Document saved successfully to:', filePath)
    } catch (error: any) {
      console.error('Error saving document:', error)
      throw new Error(`Не удалось сохранить документ: ${error.message}`)
    }

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
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      properties: error.properties,
    })
    
    // Возвращаем более детальную информацию об ошибке
    let errorMessage = 'Internal server error'
    if (error.message) {
      errorMessage = error.message
    } else if (error.properties && error.properties.errors instanceof Array) {
      errorMessage = error.properties.errors
        .map((e: any) => e.message || String(e))
        .join(', ')
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

