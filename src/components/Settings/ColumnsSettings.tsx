'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Popconfirm,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { settingsStore } from '@/stores/settingsStore'
import styles from './ColumnsSettings.module.css'

function ColumnsSettings() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingColumn, setEditingColumn] = useState<any>(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingColumn(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (column: any) => {
    setEditingColumn(column)
    form.setFieldsValue({
      name: column.name,
      order: column.order,
      isVisible: column.isVisible,
      yellowLimit: column.yellowLimit,
      redLimit: column.redLimit,
    })
    setIsModalVisible(true)
  }

  const handleMoveUp = async (column: any) => {
    const currentIndex = settingsStore.columns.findIndex((c) => c.id === column.id)
    if (currentIndex > 0) {
      const prevColumn = settingsStore.columns[currentIndex - 1]
      const newOrder = prevColumn.order
      const prevOrder = column.order
      
      try {
        await settingsStore.updateColumn(column.id, { order: newOrder })
        await settingsStore.updateColumn(prevColumn.id, { order: prevOrder })
        await settingsStore.fetchColumns()
        message.success('Порядок изменен')
      } catch (error: any) {
        message.error(error.message || 'Ошибка при изменении порядка')
      }
    }
  }

  const handleMoveDown = async (column: any) => {
    const currentIndex = settingsStore.columns.findIndex((c) => c.id === column.id)
    if (currentIndex < settingsStore.columns.length - 1) {
      const nextColumn = settingsStore.columns[currentIndex + 1]
      const newOrder = nextColumn.order
      const nextOrder = column.order
      
      try {
        await settingsStore.updateColumn(column.id, { order: newOrder })
        await settingsStore.updateColumn(nextColumn.id, { order: nextOrder })
        await settingsStore.fetchColumns()
        message.success('Порядок изменен')
      } catch (error: any) {
        message.error(error.message || 'Ошибка при изменении порядка')
      }
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await settingsStore.deleteColumn(id)
      message.success('Колонка удалена')
    } catch (error: any) {
      message.error(error.message || 'Ошибка при удалении')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingColumn) {
        await settingsStore.updateColumn(editingColumn.id, values)
        message.success('Колонка обновлена')
      } else {
        const maxOrder = Math.max(
          ...settingsStore.columns.map((c) => c.order),
          0
        )
        await settingsStore.createColumn(
          values.name,
          values.order ?? maxOrder + 1,
          values.isVisible ?? true,
          values.yellowLimit ?? null,
          values.redLimit ?? null
        )
        message.success('Колонка создана')
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
      title: 'Порядок',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Видимость',
      dataIndex: 'isVisible',
      key: 'isVisible',
      render: (visible: boolean) => (visible ? 'Да' : 'Нет'),
    },
    {
      title: 'Лимит желтый (дни)',
      dataIndex: 'yellowLimit',
      key: 'yellowLimit',
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'Лимит красный (дни)',
      dataIndex: 'redLimit',
      key: 'redLimit',
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: any, index: number) => {
        const sortedColumns = [...settingsStore.columns].sort((a, b) => a.order - b.order)
        const currentIndex = sortedColumns.findIndex((c) => c.id === record.id)
        const isFirst = currentIndex === 0
        const isLast = currentIndex === sortedColumns.length - 1

        return (
          <div className={styles.actions}>
            <Button
              icon={<ArrowUpOutlined />}
              onClick={() => handleMoveUp(record)}
              size="small"
              disabled={isFirst}
              title="Переместить вверх"
            />
            <Button
              icon={<ArrowDownOutlined />}
              onClick={() => handleMoveDown(record)}
              size="small"
              disabled={isLast}
              title="Переместить вниз"
            />
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
            <Popconfirm
              title="Удалить колонку?"
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
        )
      },
    },
  ]

  return (
    <div className={styles.columnsSettings}>
      <div className={styles.header}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить колонку
        </Button>
      </div>
      <Table
        dataSource={[...settingsStore.columns].sort((a, b) => a.order - b.order)}
        columns={columns}
        rowKey="id"
        loading={settingsStore.loading}
      />
      <Modal
        title={editingColumn ? 'Редактировать колонку' : 'Создать колонку'}
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
            label="Порядок"
            name="order"
            rules={[{ required: true, message: 'Введите порядок' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Видимость"
            name="isVisible"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="Лимит желтый (дни) - когда карточка становится желтой"
            name="yellowLimit"
            tooltip="Количество дней, после которых карточка становится желтой. Оставьте пустым, если не нужно."
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Не установлен" />
          </Form.Item>
          <Form.Item
            label="Лимит красный (дни) - когда карточка становится красной"
            name="redLimit"
            tooltip="Количество дней, после которых карточка становится красной. Оставьте пустым, если не нужно."
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Не установлен" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default observer(ColumnsSettings)

