'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Input, DatePicker, Button, message, Select } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from '@/lib/dayjs-config'
import { boardStore } from '@/stores/boardStore'
import { settingsStore } from '@/stores/settingsStore'

interface CreateCardModalProps {
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

function CreateCardModal({ open, onCancel, onSuccess }: CreateCardModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      // Загружаем настройки, если еще не загружены
      if (!settingsStore.settings.executionDeadlineDefault) {
        settingsStore.fetchSettings()
      }
      
      // Получаем первую колонку и первый приоритет
      const firstColumn = boardStore.columns.find((c) => c.isVisible) || boardStore.columns[0]
      const firstPriority = boardStore.priorities[0]
      
      // Вычисляем дефолтный срок исполнения
      const defaultDays = parseInt(settingsStore.settings.executionDeadlineDefault || '7') || 7
      const defaultDeadline = dayjs().add(defaultDays, 'day')
      
      form.setFieldsValue({
        columnId: firstColumn?.id,
        priorityId: firstPriority?.id,
        executionDeadline: defaultDeadline,
      })
    }
  }, [open, form])

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      
      await boardStore.createCard({
        instruments: values.instruments || '',
        deliveryAddress: values.deliveryAddress || '',
        contacts: values.contacts || '',
        organization: values.organization || '',
        shippingDate: values.shippingDate ? values.shippingDate.toDate() : null,
        notes: values.notes || null,
        postalOrder: values.postalOrder || null,
        columnId: values.columnId,
        priorityId: values.priorityId,
        executionDeadline: values.executionDeadline ? values.executionDeadline.toDate() : null,
      })
      
      message.success('Заявка успешно создана')
      form.resetFields()
      onCancel()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      message.error(error.message || 'Ошибка при создании заявки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Создать заявку"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Создать"
      cancelText="Отмена"
      confirmLoading={loading}
      width={700}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Организация"
          name="organization"
          rules={[{ required: true, message: 'Введите название организации' }]}
        >
          <Input placeholder="Название организации" />
        </Form.Item>
        
        <Form.Item
          label="Приборы"
          name="instruments"
          rules={[{ required: true, message: 'Введите информацию о приборах' }]}
        >
          <Input.TextArea rows={3} placeholder="Информация о приборах" />
        </Form.Item>
        
        <Form.Item
          label="Адрес доставки"
          name="deliveryAddress"
          rules={[{ required: true, message: 'Введите адрес доставки' }]}
        >
          <Input.TextArea rows={2} placeholder="Адрес доставки" />
        </Form.Item>
        
        <Form.Item
          label="Контакты"
          name="contacts"
          rules={[{ required: true, message: 'Введите контактные данные' }]}
        >
          <Input.TextArea rows={2} placeholder="Контактные данные" />
        </Form.Item>
        
        <Form.Item label="Дата отправки" name="shippingDate">
          <DatePicker
            style={{ width: '100%' }}
            format="DD.MM.YYYY"
            placeholder="ДД.ММ.ГГГГ"
          />
        </Form.Item>
        
        <Form.Item label="Примечания" name="notes">
          <Input.TextArea rows={3} placeholder="Дополнительные примечания" />
        </Form.Item>
        
        <Form.Item label="Почтовый ордер" name="postalOrder">
          <Input placeholder="Номер почтового ордера" />
        </Form.Item>
        
        <Form.Item
          label="Колонка"
          name="columnId"
          rules={[{ required: true, message: 'Выберите колонку' }]}
        >
          <Select placeholder="Выберите колонку">
            {boardStore.columns
              .filter((c) => c.isVisible)
              .map((column) => (
                <Select.Option key={column.id} value={column.id}>
                  {column.name}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          label="Приоритет"
          name="priorityId"
          rules={[{ required: true, message: 'Выберите приоритет' }]}
        >
          <Select placeholder="Выберите приоритет">
            {boardStore.priorities.map((priority) => (
              <Select.Option key={priority.id} value={priority.id}>
                <span style={{ color: priority.color }}>●</span> {priority.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item label="Срок исполнения" name="executionDeadline">
          <DatePicker
            style={{ width: '100%' }}
            format="DD.MM.YYYY"
            placeholder="ДД.ММ.ГГГГ"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateCardModal

