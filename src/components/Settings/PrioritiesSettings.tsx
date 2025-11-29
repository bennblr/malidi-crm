'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Table, Button, Modal, Form, Input, ColorPicker, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { settingsStore } from '@/stores/settingsStore'
import styles from './PrioritiesSettings.module.css'

function PrioritiesSettings() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingPriority, setEditingPriority] = useState<any>(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingPriority(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (priority: any) => {
    setEditingPriority(priority)
    form.setFieldsValue({
      name: priority.name,
      color: priority.color,
      order: priority.order,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await settingsStore.deletePriority(id)
      message.success('Приоритет удален')
    } catch (error: any) {
      message.error(error.message || 'Ошибка при удалении')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingPriority) {
        await settingsStore.updatePriority(editingPriority.id, values)
        message.success('Приоритет обновлен')
      } else {
        await settingsStore.createPriority(
          values.name,
          typeof values.color === 'string' ? values.color : values.color.toHexString(),
          values.order
        )
        message.success('Приоритет создан')
      }
      setIsModalVisible(false)
      form.resetFields()
    } catch (error: any) {
      message.error(error.message || 'Ошибка при сохранении')
    }
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Цвет',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <div
          style={{
            width: 30,
            height: 30,
            backgroundColor: color,
            borderRadius: 4,
            border: '1px solid #d9d9d9',
          }}
        />
      ),
    },
    {
      title: 'Порядок',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: any) => (
        <div className={styles.actions}>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Удалить приоритет?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.prioritiesSettings}>
      <div className={styles.header}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить приоритет
        </Button>
      </div>
      <Table
        dataSource={settingsStore.priorities}
        columns={columns}
        rowKey="id"
        loading={settingsStore.loading}
      />
      <Modal
        title={editingPriority ? 'Редактировать приоритет' : 'Создать приоритет'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Цвет"
            name="color"
            rules={[{ required: true, message: 'Выберите цвет' }]}
          >
            <ColorPicker showText />
          </Form.Item>
          <Form.Item
            label="Порядок"
            name="order"
            rules={[{ required: true, message: 'Введите порядок' }]}
          >
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default observer(PrioritiesSettings)

