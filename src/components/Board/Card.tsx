'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Form, Input, DatePicker, Button, Tag, message } from 'antd'
import dayjs from 'dayjs'
import { boardStore } from '@/stores/boardStore'
import { CardWithRelations } from '@/stores/boardStore'
import styles from './Card.module.css'

interface CardProps {
  card: CardWithRelations
}

function Card({ card }: CardProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)
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
      setIsModalVisible(false)
    } catch (error) {
      console.error('Error updating card:', error)
    }
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
        title="Редактировать карточку"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Отмена
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            Сохранить
          </Button>,
        ]}
        width={600}
      >
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
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Примечания" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Почтовый ордер" name="postalOrder">
            <Input />
          </Form.Item>
          <Form.Item label="Срок исполнения" name="executionDeadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default observer(Card)

