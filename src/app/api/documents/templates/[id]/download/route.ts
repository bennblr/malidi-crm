import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readTemplate } from '@/lib/file-storage'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.documentTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Если это демо-шаблон и файл отсутствует, пересоздаем его
    if (template.name === 'Демонстрационный шаблон') {
      try {
        await fs.access(template.filePath)
      } catch {
        // Файл отсутствует, пересоздаем демо-шаблон
        const { createDemoTemplate } = await import('@/lib/create-demo-template')
        await createDemoTemplate()
        
        // Обновляем данные шаблона из БД
        const updatedTemplate = await prisma.documentTemplate.findUnique({
          where: { id: params.id },
        })
        
        if (updatedTemplate) {
          Object.assign(template, updatedTemplate)
        }
      }
    }

    // Проверяем существование файла
    let finalFilePath = template.filePath
    
    try {
      await fs.access(template.filePath)
      console.log('Template file found at:', template.filePath)
    } catch (accessError) {
      console.error('Template file not found at original path:', template.filePath, accessError)
      
      // Пытаемся найти файл по имени в директории templates
      const TEMPLATES_DIR = path.join(process.cwd(), 'uploads', 'templates')
      const alternativePath = path.join(TEMPLATES_DIR, template.fileName)
      
      try {
        await fs.access(alternativePath)
        console.log('Template file found at alternative path:', alternativePath)
        finalFilePath = alternativePath
      } catch (altError) {
        console.error('Alternative path also failed:', alternativePath, altError)
        console.error('Current working directory:', process.cwd())
        console.error('Template data:', { id: template.id, fileName: template.fileName, filePath: template.filePath })
        
        // Пытаемся найти файл в любой поддиректории uploads
        try {
          const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
          const files = await fs.readdir(UPLOAD_DIR, { recursive: true })
          console.log('Files in uploads directory:', files)
        } catch (readError) {
          console.error('Error reading uploads directory:', readError)
        }
        
        return NextResponse.json(
          { 
            error: 'Template file not found on server', 
            details: `Original path: ${template.filePath}, Alternative: ${alternativePath}`,
            cwd: process.cwd()
          },
          { status: 404 }
        )
      }
    }

    // Читаем файл шаблона
    const fileBuffer = await readTemplate(finalFilePath)

    // Кодируем имя файла для заголовка Content-Disposition (RFC 5987)
    // Создаем ASCII-совместимое имя файла (без кириллицы)
    const asciiFileName = template.fileName.replace(/[^\x00-\x7F]/g, '_') // Заменяем не-ASCII символы на _
    const encodedFileName = encodeURIComponent(template.fileName)
    
    // Используем только ASCII имя в основной части, кириллицу только в filename*
    const contentDisposition = `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`

    // Возвращаем файл для скачивания
    // Преобразуем Buffer в Uint8Array для NextResponse
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error: any) {
    console.error('Error downloading template:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

