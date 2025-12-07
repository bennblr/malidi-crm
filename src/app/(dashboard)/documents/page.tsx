'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Tabs, Table, Button, Space, Tag, message, Popconfirm, Modal, Form, Input, Card, Collapse, Typography, Alert } from 'antd'
import { FileTextOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, InfoCircleOutlined, CodeOutlined } from '@ant-design/icons'
import TemplateUpload from '@/components/Documents/TemplateUpload'
import DocumentGenerator from '@/components/Documents/DocumentGenerator'
import dayjs from '@/lib/dayjs-config'
import styles from './documents.module.css'

const { Title, Paragraph, Text, Link } = Typography
const { Panel } = Collapse

interface Template {
  id: string
  name: string
  description?: string
  fileName: string
  fields: Array<{
    name: string
    type: 'simple' | 'loop' | 'condition'
  }>
  createdAt: string
  user: {
    id: string
    email: string
  }
  _count: {
    documents: number
  }
}

interface GeneratedDocument {
  id: string
  fileName: string
  data: Record<string, any>
  createdAt: string
  template: {
    id: string
    name: string
  }
  card: {
    id: string
    organization: string
  } | null
  user: {
    id: string
    email: string
  }
  downloadUrl: string
}

function DocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [documents, setDocuments] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [generatorVisible, setGeneratorVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  useEffect(() => {
    fetchTemplates()
    fetchDocuments()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/documents/templates')
      if (!response.ok) throw new Error('Ошибка загрузки шаблонов')
      const data = await response.json()
      setTemplates(
        data.map((t: any) => ({
          ...t,
          fields: typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields,
        }))
      )
    } catch (error) {
      message.error('Не удалось загрузить шаблоны')
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents/history')
      if (!response.ok) throw new Error('Ошибка загрузки истории')
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      message.error('Не удалось загрузить историю документов')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/documents/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Ошибка удаления шаблона')

      message.success('Шаблон удален')
      fetchTemplates()
    } catch (error) {
      message.error('Не удалось удалить шаблон')
    }
  }

  const handleDownload = async (downloadUrl: string, fileName: string) => {
    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      message.error('Ошибка скачивания файла')
    }
  }

  const handleDownloadTemplate = async (templateId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/documents/templates/${templateId}/download`)
      if (!response.ok) throw new Error('Ошибка скачивания шаблона')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success('Шаблон успешно скачан')
    } catch (error) {
      message.error('Ошибка скачивания шаблона')
    }
  }

  const templatesColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: 'Поля',
      key: 'fields',
      render: (_: any, record: Template) => (
        <Space wrap>
          {record.fields.map((field) => (
            <Tag
              key={field.name}
              color={
                field.type === 'loop'
                  ? 'blue'
                  : field.type === 'condition'
                  ? 'orange'
                  : 'default'
              }
            >
              {field.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Использований',
      key: 'usage',
      render: (_: any, record: Template) => record._count.documents,
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Создал',
      key: 'user',
      render: (_: any, record: Template) => record.user.email,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Template) => (
        <Space>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => {
              setSelectedTemplate(record)
              setGeneratorVisible(true)
            }}
          >
            Создать
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadTemplate(record.id, record.fileName)}
            title="Скачать шаблон"
          >
            Скачать
          </Button>
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={() => {
              const apiUrl = `${window.location.origin}/api/documents/templates/${record.id}/generate?client_name=Пример&delivery_address=Москва`
              navigator.clipboard.writeText(apiUrl)
              message.success('URL скопирован в буфер обмена')
            }}
            title="Скопировать API URL"
          >
            API
          </Button>
          <Popconfirm
            title="Удалить шаблон?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteTemplate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const documentsColumns = [
    {
      title: 'Название файла',
      dataIndex: 'fileName',
      key: 'fileName',
    },
    {
      title: 'Шаблон',
      key: 'template',
      render: (_: any, record: GeneratedDocument) => record.template.name,
    },
    {
      title: 'Карточка',
      key: 'card',
      render: (_: any, record: GeneratedDocument) =>
        record.card ? record.card.organization : '-',
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Создал',
      key: 'user',
      render: (_: any, record: GeneratedDocument) => record.user.email,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: GeneratedDocument) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record.downloadUrl, record.fileName)}
        >
          Скачать
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.documentsPage}>
      <div className={styles.header}>
        <h1>Документы</h1>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setUploadModalVisible(true)}
        >
          Загрузить шаблон
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'templates',
            label: 'Шаблоны',
            children: (
              <Table
                columns={templatesColumns}
                dataSource={templates}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'history',
            label: 'История',
            children: (
              <Table
                columns={documentsColumns}
                dataSource={documents}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'docs',
            label: (
              <Space>
                <InfoCircleOutlined />
                <span>Документация</span>
              </Space>
            ),
            children: (
              <div className={styles.documentation}>
                <Card>
                  <Title level={2}>Документация по работе с шаблонами документов</Title>
                  
                  <Alert
                    message="Важно"
                    description="Система поддерживает шаблоны Microsoft Word (.docx) с тегами docxtemplater"
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />

                  <Title level={3}>1. Создание шаблона</Title>
                  <Paragraph>
                    Создайте документ Microsoft Word (.docx) и используйте теги для заполнения полей:
                  </Paragraph>
                  
                  <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                    <Text code>{'{client_name}'}</Text> - простое поле (текст)
                    <br />
                    <Text code>{'{#items}'}</Text> - массив (цикл)
                    <br />
                    <Text code>{'{?condition}'}</Text> - условие (если/иначе)
                  </Card>

                  <Title level={4}>Пример простого шаблона:</Title>
                  <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`Договор с {client_name}

Адрес доставки: {delivery_address}
Контакты: {contacts}

{#items}
- {name}: {quantity} шт.
{/items}

{?has_notes}
Примечания: {notes}
{/has_notes}`}
                    </pre>
                  </Card>

                  <Title level={3}>2. Загрузка шаблона</Title>
                  <Paragraph>
                    Нажмите кнопку "Загрузить шаблон" и выберите файл .docx. Система автоматически определит все поля в шаблоне.
                  </Paragraph>

                  <Title level={3}>3. Генерация документа через интерфейс</Title>
                  <Paragraph>
                    Выберите шаблон в таблице и нажмите "Создать". Заполните необходимые поля и скачайте готовый документ.
                  </Paragraph>

                  <Title level={3}>4. Генерация документа через API (GET запрос)</Title>
                  <Paragraph>
                    Для каждого шаблона доступен GET endpoint для генерации документа с параметрами:
                  </Paragraph>

                  <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                    <Text code>
                      GET /api/documents/templates/&#123;templateId&#125;/generate?param1=value1&param2=value2
                    </Text>
                  </Card>

                  <Title level={4}>Параметры запроса:</Title>
                  <ul>
                    <li>
                      <Text strong>cardId</Text> (опционально) - ID карточки для автозаполнения данных
                    </li>
                    <li>
                      Любые другие параметры - будут использованы как значения для полей шаблона
                    </li>
                  </ul>

                  <Title level={4}>Примеры использования:</Title>
                  
                  <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                    <Paragraph>
                      <Text strong>Пример 1:</Text> Генерация с параметрами из query string
                    </Paragraph>
                    <Text code copyable>
                      /api/documents/templates/abc123/generate?client_name=ООО+Рога&delivery_address=Москва&contacts=+7+999+123-45-67
                    </Text>
                  </Card>

                  <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                    <Paragraph>
                      <Text strong>Пример 2:</Text> Генерация с автозаполнением из карточки
                    </Paragraph>
                    <Text code copyable>
                      /api/documents/templates/abc123/generate?cardId=card123
                    </Text>
                  </Card>

                  <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                    <Paragraph>
                      <Text strong>Пример 3:</Text> Комбинация карточки и дополнительных параметров
                    </Paragraph>
                    <Text code copyable>
                      /api/documents/templates/abc123/generate?cardId=card123&additional_field=значение
                    </Text>
                  </Card>

                  <Title level={4}>Автозаполнение из карточки:</Title>
                  <Paragraph>
                    При указании <Text code>cardId</Text> автоматически заполняются следующие поля:
                  </Paragraph>
                  <ul>
                    <li><Text code>client_name</Text> / <Text code>organization</Text> - название организации</li>
                    <li><Text code>delivery_address</Text> / <Text code>address</Text> - адрес доставки</li>
                    <li><Text code>contacts</Text> / <Text code>contact</Text> - контакты</li>
                    <li><Text code>instruments</Text> / <Text code>instrument</Text> - приборы</li>
                    <li><Text code>postal_order</Text> / <Text code>order</Text> - почтовый ордер</li>
                    <li><Text code>notes</Text> / <Text code>note</Text> - примечания</li>
                    <li><Text code>shipping_date</Text> - дата отправки (формат: ДД.ММ.ГГГГ)</li>
                    <li><Text code>execution_deadline</Text> / <Text code>deadline</Text> - срок исполнения (формат: ДД.ММ.ГГГГ)</li>
                  </ul>

                  <Title level={3}>5. Типы тегов docxtemplater</Title>
                  
                  <Collapse>
                    <Panel header="Простые теги {field}" key="1">
                      <Paragraph>
                        Используются для вставки простых значений:
                      </Paragraph>
                      <Text code>{'{client_name}'}</Text> → заменится на значение параметра <Text code>client_name</Text>
                    </Panel>
                    
                    <Panel header="Циклы {#array}...{/array}" key="2">
                      <Paragraph>
                        Используются для повторения блока для каждого элемента массива:
                      </Paragraph>
                      <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{#items}
- {name}: {price} руб.
{/items}`}
                        </pre>
                      </Card>
                      <Paragraph>
                        В API передайте массив как JSON строку или используйте специальный формат.
                      </Paragraph>
                    </Panel>
                    
                    <Panel header="Условия {?condition}...{/condition}" key="3">
                      <Paragraph>
                        Используются для условного отображения блока:
                      </Paragraph>
                      <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{?has_discount}
Скидка: {discount}%
{/has_discount}`}
                        </pre>
                      </Card>
                      <Paragraph>
                        В API передайте <Text code>has_discount=true</Text> или <Text code>has_discount=false</Text>
                      </Paragraph>
                    </Panel>
                  </Collapse>

                  <Title level={3}>6. Формат ответа</Title>
                  <Paragraph>
                    API возвращает готовый .docx файл для скачивания с заголовками:
                  </Paragraph>
                  <ul>
                    <li><Text code>Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document</Text></li>
                    <li><Text code>Content-Disposition: attachment; filename="..."</Text></li>
                  </ul>

                  <Alert
                    message="Примечание"
                    description="Все сгенерированные документы сохраняются в истории и привязаны к шаблону и пользователю"
                    type="info"
                    showIcon
                    style={{ marginTop: 24 }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Загрузить шаблон"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <TemplateUpload
          onUploadSuccess={() => {
            setUploadModalVisible(false)
            fetchTemplates()
          }}
        />
      </Modal>

      <DocumentGenerator
        card={undefined}
        visible={generatorVisible}
        onCancel={() => {
          setGeneratorVisible(false)
          setSelectedTemplate(null)
        }}
        onSuccess={() => {
          fetchDocuments()
        }}
      />
    </div>
  )
}

export default observer(DocumentsPage)

