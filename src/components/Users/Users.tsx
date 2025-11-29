'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { userStore } from '@/stores/userStore'
import styles from './Users.module.css'

function Users() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    form.setFieldsValue({
      email: user.email,
      role: user.role,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await userStore.deleteUser(id)
      message.success('Пользователь удален')
    } catch (error: any) {
      message.error(error.message || 'Ошибка при удалении')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        await userStore.updateUser(editingUser.id, values)
        message.success('Пользователь обновлен')
      } else {
        await userStore.createUser(values.email, values.password, values.role)
        message.success('Пользователь создан')
      }
      setIsModalVisible(false)
      form.resetFields()
    } catch (error: any) {
      message.error(error.message || 'Ошибка при сохранении')
    }
  }

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (role === 'ADMIN' ? 'Администратор' : 'Редактор'),
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
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
            title="Удалить пользователя?"
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
    <div className={styles.users}>
      <h1>Пользователи</h1>
      <div className={styles.header}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить пользователя
        </Button>
      </div>
      <Table
        dataSource={userStore.users}
        columns={columns}
        rowKey="id"
        loading={userStore.loading}
      />
      <Modal
        title={editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' },
            ]}
          >
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="Пароль"
              name="password"
              rules={[
                { required: true, message: 'Введите пароль' },
                { min: 6, message: 'Минимум 6 символов' },
              ]}
            >
              <Input.Password />
            </Form.Item>
          )}
          {editingUser && (
            <Form.Item
              label="Новый пароль (оставьте пустым, чтобы не менять)"
              name="password"
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item
            label="Роль"
            name="role"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select>
              <Select.Option value="ADMIN">Администратор</Select.Option>
              <Select.Option value="EDITOR">Редактор</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default observer(Users)

