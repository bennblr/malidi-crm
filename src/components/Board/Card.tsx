'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Form, Input, DatePicker, Button, Tag, message, Descriptions, Popconfirm } from 'antd'
import { EditOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from '@/lib/dayjs-config'
import { boardStore } from '@/stores/boardStore'
import { CardWithRelations } from '@/stores/boardStore'
import styles from './Card.module.css'

interface CardProps {
  card: CardWithRelations
}

function Card({ card }: CardProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false)
  const [closeForm] = Form.useForm()
  const [form] = Form.useForm()
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleCardClick = () => {
    // При открытии модального окна всегда начинаем с режима просмотра
    setIsEditMode(false)
    form.setFieldsValue({
      instruments: card.instruments,
      deliveryAddress: card.deliveryAddress,
      contacts: card.contacts,
      organization: card.organization,
      shippingDate: card.shippingDate ? dayjs(card.shippingDate) : null,
      notes: card.notes,
      postalOrder: card.postalOrder,
      executionDeadline: card.executionDeadline
        ? dayjs(card.executionDeadline)
        : null,
    })
    setIsModalVisible(true)
  }

  const handleEditClick = () => {
    setIsEditMode(true)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    // Восстанавливаем значения из карточки
    form.setFieldsValue({
      instruments: card.instruments,
      deliveryAddress: card.deliveryAddress,
      contacts: card.contacts,
      organization: card.organization,
      shippingDate: card.shippingDate ? dayjs(card.shippingDate) : null,
      notes: card.notes,
      postalOrder: card.postalOrder,
      executionDeadline: card.executionDeadline
        ? dayjs(card.executionDeadline)
        : null,
    })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await boardStore.updateCard(card.id, {
        instruments: values.instruments,
        deliveryAddress: values.deliveryAddress,
        contacts: values.contacts,
        organization: values.organization,
        shippingDate: values.shippingDate
          ? values.shippingDate.toDate()
          : null,
        notes: values.notes,
        postalOrder: values.postalOrder,
        executionDeadline: values.executionDeadline
          ? values.executionDeadline.toDate()
          : null,
      })
      message.success('Карточка обновлена')
      setIsEditMode(false)
      // Не закрываем модальное окно, остаемся в режиме просмотра
    } catch (error) {
      console.error('Error updating card:', error)
    }
  }

  const handleCloseClick = () => {
    setIsCloseModalVisible(true)
  }

  const handleCloseCard = async () => {
    try {
      const values = await closeForm.validateFields()
      await boardStore.closeCard(card.id, values.comment || '')
      message.success('Заявка завершена')
      setIsCloseModalVisible(false)
      setIsModalVisible(false)
      closeForm.resetFields()
    } catch (error) {
      console.error('Error closing card:', error)
    }
  }

  // Вычисляем количество дней в текущей колонке
  const getDaysInColumn = () => {
    const now = new Date()
    const updatedAt = card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt)
    const timeInColumn = now.getTime() - updatedAt.getTime()
    const days = Math.floor(timeInColumn / (1000 * 60 * 60 * 24)) + 1
    return days
  }

  const isDeadlineExpired =
    card.executionDeadline && new Date() > new Date(card.executionDeadline)

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={styles.card}
        onClick={handleCardClick}
      >
        <div
          className={styles.priorityBar}
          style={{ backgroundColor: card.priority.color }}
        />
        <div className={styles.content}>
          <div className={styles.header}>
            <Tag color={card.priority.color}>{card.priority.name}</Tag>
            {isDeadlineExpired && (
              <Tag color="red">Срок истек</Tag>
            )}
            <div className={styles.daysIndicator}>
              <span
                className={styles.daysCircle}
                style={{ backgroundColor: card.priority.color }}
                title={`В столбце ${getDaysInColumn()} ${getDaysInColumn() === 1 ? 'день' : getDaysInColumn() < 5 ? 'дня' : 'дней'}`}
              >
                {getDaysInColumn()}
              </span>
            </div>
            <span className={styles.cardId}>#{card.id.slice(-8)}</span>
          </div>
          <h4 className={styles.title}>{card.organization}</h4>
          <p className={styles.address}>{card.deliveryAddress}</p>
          <p className={styles.contacts}>{card.contacts}</p>
          {card.postalOrder && (
            <p className={styles.order}>Ордер: {card.postalOrder}</p>
          )}
          {card.executionDeadline && (
            <p className={styles.deadline}>
              Срок: {dayjs(card.executionDeadline).format('DD.MM.YYYY')}
            </p>
          )}
        </div>
      </div>

      <Modal
        title={isEditMode ? 'Редактировать карточку' : 'Просмотр карточки'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          setIsEditMode(false)
        }}
        footer={
          isEditMode
            ? [
                <Button key="cancel" onClick={handleCancelEdit}>
                  Отмена
                </Button>,
                <Button key="save" type="primary" onClick={handleSave}>
                  Сохранить
                </Button>,
              ]
            : [
                <Button key="close" onClick={() => setIsModalVisible(false)}>
                  Закрыть
                </Button>,
                <Button
                  key="edit"
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEditClick}
                >
                  Редактировать
                </Button>,
                <Popconfirm
                  key="completeCard"
                  title="Завершить заявку"
                  description="Вы уверены, что хотите завершить эту заявку?"
                  onConfirm={handleCloseClick}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Button
                    danger
                    icon={<CheckCircleOutlined />}
                  >
                    Завершить
                  </Button>
                </Popconfirm>,
              ]
        }
        width={700}
      >
        {isEditMode ? (
          <Form form={form} layout="vertical">
            <Form.Item label="Организация" name="organization">
              <Input />
            </Form.Item>
            <Form.Item label="Приборы" name="instruments">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Адрес доставки" name="deliveryAddress">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="Контакты" name="contacts">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="Дата отправки" name="shippingDate">
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                placeholder="ДД.ММ.ГГГГ"
              />
            </Form.Item>
            <Form.Item label="Примечания" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Почтовый ордер" name="postalOrder">
              <Input />
            </Form.Item>
            <Form.Item label="Срок исполнения" name="executionDeadline">
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                placeholder="ДД.ММ.ГГГГ"
              />
            </Form.Item>
          </Form>
        ) : (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Приоритет">
              <Tag color={card.priority.color}>{card.priority.name}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Колонка">
              {card.column.name}
            </Descriptions.Item>
            <Descriptions.Item label="Организация">
              {card.organization}
            </Descriptions.Item>
            <Descriptions.Item label="Приборы">
              {card.instruments || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Адрес доставки">
              {card.deliveryAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Контакты">
              {card.contacts || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата отправки">
              {card.shippingDate
                ? dayjs(card.shippingDate).format('DD.MM.YYYY')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Примечания">
              {card.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Почтовый ордер">
              {card.postalOrder || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Срок исполнения">
              {card.executionDeadline
                ? dayjs(card.executionDeadline).format('DD.MM.YYYY')
                : '-'}
              {isDeadlineExpired && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  Срок истек
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Создано">
              {dayjs(card.createdAt).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Обновлено">
              {dayjs(card.updatedAt).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Завершить заявку"
        open={isCloseModalVisible}
        onCancel={() => {
          setIsCloseModalVisible(false)
          closeForm.resetFields()
        }}
        onOk={handleCloseCard}
        okText="Закрыть"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item
            label="Комментарий"
            name="comment"
            rules={[{ required: false }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Введите комментарий (необязательно)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default observer(Card)

