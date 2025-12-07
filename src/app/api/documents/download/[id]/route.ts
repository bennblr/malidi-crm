import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readDocument } from '@/lib/file-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Downloading document with ID:', params.id)

    const document = await prisma.generatedDocument.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      console.error('Document not found for ID:', params.id)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('Document found:', { id: document.id, fileName: document.fileName, filePath: document.filePath })

    // Читаем файл
    let fileBuffer: Buffer
    try {
      fileBuffer = await readDocument(document.filePath)
      console.log('File read successfully, size:', fileBuffer.length)
    } catch (readError: any) {
      console.error('Error reading document file:', readError)
      console.error('File path:', document.filePath)
      return NextResponse.json(
        { error: `Не удалось прочитать файл документа: ${readError.message}` },
        { status: 500 }
      )
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('File buffer is empty')
      return NextResponse.json(
        { error: 'Файл документа пуст' },
        { status: 500 }
      )
    }

    // Кодируем имя файла для заголовка Content-Disposition (RFC 5987)
    // Создаем ASCII-совместимое имя файла (без кириллицы)
    const asciiFileName = document.fileName.replace(/[^\x00-\x7F]/g, '_') // Заменяем не-ASCII символы на _
    const encodedFileName = encodeURIComponent(document.fileName)
    
    // Используем только ASCII имя в основной части, кириллицу только в filename*
    const contentDisposition = `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`

    console.log('Content-Disposition header:', contentDisposition)
    console.log('ASCII filename:', asciiFileName)
    console.log('Encoded filename:', encodedFileName)

    // Возвращаем файл для скачивания
    // Преобразуем Buffer в Uint8Array для NextResponse
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error: any) {
    console.error('Error downloading document:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

