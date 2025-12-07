'use client'

import { useState, useCallback } from 'react'
import { Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import styles from './TemplateUpload.module.css'

interface TemplateUploadProps {
  onUploadSuccess?: (template: any) => void
}

function TemplateUpload({ onUploadSuccess }: TemplateUploadProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleChange: UploadProps['onChange'] = (info) => {
    let newFileList = [...info.fileList]

    // Ограничиваем до одного файла
    newFileList = newFileList.slice(-1)

    // Проверяем тип файла
    newFileList = newFileList.map((file) => {
      if (file.response) {
        file.url = file.response.url
      }
      return file
    })

    setFileList(newFileList)
  }

  const handleUpload = useCallback(async (options: any) => {
    const { file, onSuccess, onError } = options

    // Проверяем тип файла
    if (!file.name.endsWith('.docx')) {
      message.error('Поддерживаются только файлы .docx')
      onError(new Error('Invalid file type'))
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name.replace('.docx', ''))
      formData.append('description', '')

      const response = await fetch('/api/documents/templates', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка загрузки шаблона')
      }

      const template = await response.json()
      message.success('Шаблон успешно загружен')
      setFileList([])
      onSuccess?.(template, file)
      onUploadSuccess?.(template)
    } catch (error: any) {
      message.error(error.message || 'Ошибка загрузки шаблона')
      onError?.(error)
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess])

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.docx',
    fileList,
    onChange: handleChange,
    customRequest: handleUpload,
    onRemove: () => {
      setFileList([])
    },
    beforeUpload: (file) => {
      const isDocx = file.name.endsWith('.docx')
      if (!isDocx) {
        message.error('Поддерживаются только файлы .docx!')
      }
      return false // Предотвращаем автоматическую загрузку
    },
  }

  return (
    <Upload.Dragger {...props} className={styles.uploader} disabled={uploading}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Нажмите или перетащите файл .docx сюда</p>
      <p className="ant-upload-hint">
        Поддерживаются только файлы Microsoft Word (.docx)
      </p>
    </Upload.Dragger>
  )
}

export default TemplateUpload

