'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, Select, message, Space, Tag } from 'antd'
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons'
import { CardWithRelations } from '@/stores/boardStore'
import styles from './DocumentGenerator.module.css'

interface Template {
  id: string
  name: string
  description?: string
  fields: Array<{
    name: string
    type: 'simple' | 'loop' | 'condition'
  }>
}

interface DocumentGeneratorProps {
  card?: CardWithRelations
  visible: boolean
  onCancel: () => void
  onSuccess?: () => void
}

function DocumentGenerator({ card, visible, onCancel, onSuccess }: DocumentGeneratorProps) {
  const [form] = Form.useForm()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (visible) {
      fetchTemplates()
    }
  }, [visible])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/documents/templates')
      if (!response.ok) throw new Error('Ошибка загрузки шаблонов')
      const data = await response.json()
      setTemplates(data.map((t: any) => ({
        ...t,
        fields: typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields,
      })))
    } catch (error) {
      message.error('Не удалось загрузить шаблоны')
    }
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    setSelectedTemplate(template || null)

    // Сбрасываем форму при смене шаблона
    form.resetFields()
    
    if (template && card) {
      // Автозаполнение полей из карточки
      const initialValues: Record<string, any> = {}

      template.fields.forEach((field) => {
        // Пропускаем циклы
        if (field.type === 'loop') {
          return
        }
          switch (field.name.toLowerCase()) {
            case 'client_name':
            case 'organization':
              initialValues[field.name] = card.organization
              break
            case 'delivery_address':
            case 'address':
              initialValues[field.name] = card.deliveryAddress
              break
            case 'contacts':
            case 'contact':
              initialValues[field.name] = card.contacts
              break
            case 'instruments':
            case 'instrument':
              initialValues[field.name] = card.instruments
              break
            case 'postal_order':
            case 'order':
              initialValues[field.name] = card.postalOrder || ''
              break
            case 'notes':
            case 'note':
              initialValues[field.name] = card.notes || ''
              break
            case 'shipping_date':
              initialValues[field.name] = card.shippingDate
                ? new Date(card.shippingDate).toLocaleDateString('ru-RU')
                : ''
              break
            case 'execution_deadline':
            case 'deadline':
              initialValues[field.name] = card.executionDeadline
                ? new Date(card.executionDeadline).toLocaleDateString('ru-RU')
                : ''
              break
          }
        }
      })

      form.setFieldsValue(initialValues)
    }
  }

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      setGenerating(true)

      // Обрабатываем данные для циклов
      // Form.List уже возвращает массив объектов, так что просто используем как есть
      const processedData: Record<string, any> = { ...values }
      
      if (selectedTemplate) {
        selectedTemplate.fields.forEach((field) => {
          // Пропускаем циклы
          if (field.type === 'loop') {
            // Удаляем данные циклов из processedData
            delete processedData[field.name]
            return
          }
          // Для условий преобразуем строку в boolean
          if (field.type === 'condition' && processedData[field.name] !== undefined) {
            const value = processedData[field.name]
            if (typeof value === 'string') {
              processedData[field.name] = value === 'true' || value === '1' || value.toLowerCase() === 'да'
            }
          }
        })
      }

      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate?.id,
          cardId: card?.id,
          data: processedData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка генерации документа')
      }

      const result = await response.json()
      message.success('Документ успешно создан')

      // Скачиваем файл
      if (result.downloadUrl) {
        const downloadResponse = await fetch(result.downloadUrl)
        const blob = await downloadResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      form.resetFields()
      setSelectedTemplate(null)
      onSuccess?.()
      onCancel()
    } catch (error: any) {
      if (error.errorFields) {
        // Ошибки валидации формы
        return
      }
      message.error(error.message || 'Ошибка генерации документа')
    } finally {
      setGenerating(false)
    }
  }

  const renderFieldInput = (field: { name: string; type: string }) => {
    const fieldType = field.type

    // Отключаем поддержку циклов
    if (fieldType === 'loop') {
      return null
    }

    if (fieldType === 'condition') {
      return (
        <Form.Item
          key={field.name}
          label={
            <Space>
              <span>{field.name}</span>
              <Tag color="orange">Условие</Tag>
            </Space>
          }
          name={field.name}
          valuePropName="checked"
        >
          <Select placeholder="Выберите значение">
            <Select.Option value={true}>Да</Select.Option>
            <Select.Option value={false}>Нет</Select.Option>
          </Select>
        </Form.Item>
      )
    }

    return (
      <Form.Item
        key={field.name}
        label={field.name}
        name={field.name}
        rules={[{ required: false }]}
      >
        <Input placeholder={`Введите значение для ${field.name}`} />
      </Form.Item>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Создать документ</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Отмена
        </Button>,
        <Button
          key="generate"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleGenerate}
          loading={generating}
          disabled={!selectedTemplate}
        >
          Создать и скачать
        </Button>,
      ]}
      width={700}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Шаблон" required>
          <Select
            placeholder="Выберите шаблон"
            onChange={handleTemplateChange}
            value={selectedTemplate?.id}
            loading={loading}
          >
            {templates.map((template) => (
              <Select.Option key={template.id} value={template.id}>
                {template.name}
                {template.description && ` - ${template.description}`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedTemplate && selectedTemplate.fields.length > 0 && (
          <div className={styles.fieldsSection}>
            <h4>Заполните поля:</h4>
            {selectedTemplate.fields
              .filter((field) => field.type !== 'loop')
              .map((field) => renderFieldInput(field))}
          </div>
        )}

        {selectedTemplate && selectedTemplate.fields.length === 0 && (
          <p className={styles.noFields}>В шаблоне не найдено полей для заполнения</p>
        )}
      </Form>
    </Modal>
  )
}

export default DocumentGenerator

