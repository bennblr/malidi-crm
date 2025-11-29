'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Table, Input, Tag, Descriptions, Modal, Button, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import dayjs from '@/lib/dayjs-config'
import { CardWithRelations } from '@/stores/boardStore'
import styles from './closed.module.css'

const { Search } = Input

function ClosedCardsPage() {
  const [cards, setCards] = useState<CardWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedCard, setSelectedCard] = useState<CardWithRelations | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  useEffect(() => {
    fetchClosedCards()
  }, [])

  const fetchClosedCards = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cards?isClosed=true')
      if (!response.ok) throw new Error('Failed to fetch closed cards')
      const data = await response.json()
      setCards(data)
    } catch (error) {
      console.error('Error fetching closed cards:', error)
      message.error('Ошибка при загрузке закрытых карточек')
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (card: CardWithRelations) => {
    setSelectedCard(card)
    setIsModalVisible(true)
  }

  const filteredCards = cards.filter((card) => {
    if (!searchText) return true
    const searchLower = searchText.toLowerCase()
    return (
      card.id.toLowerCase().includes(searchLower) ||
      card.organization.toLowerCase().includes(searchLower)
    )
  })

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => <span className={styles.cardId}>#{id.slice(-8)}</span>,
    },
    {
      title: 'Организация',
      dataIndex: 'organization',
      key: 'organization',
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: { name: string; color: string }) => (
        <Tag color={priority.color}>{priority.name}</Tag>
      ),
    },
    {
      title: 'Колонка',
      dataIndex: 'column',
      key: 'column',
      render: (column: { name: string }) => column.name,
    },
    {
      title: 'Дата закрытия',
      dataIndex: 'closedAt',
      key: 'closedAt',
      render: (date: Date | null) =>
        date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: 'Комментарий',
      dataIndex: 'closedComment',
      key: 'closedComment',
      render: (comment: string | null) => comment || '-',
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Закрытые заявки</h1>
        <Search
          placeholder="Поиск по ID заявки или названию организации"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <Table
        dataSource={filteredCards}
        columns={columns}
        loading={loading}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => handleCardClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={`Заявка #${selectedCard?.id.slice(-8)}`}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedCard(null)
        }}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={700}
      >
        {selectedCard && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">
              {selectedCard.id}
            </Descriptions.Item>
            <Descriptions.Item label="Приоритет">
              <Tag color={selectedCard.priority.color}>
                {selectedCard.priority.name}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Колонка">
              {selectedCard.column.name}
            </Descriptions.Item>
            <Descriptions.Item label="Организация">
              {selectedCard.organization}
            </Descriptions.Item>
            <Descriptions.Item label="Приборы">
              {selectedCard.instruments || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Адрес доставки">
              {selectedCard.deliveryAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Контакты">
              {selectedCard.contacts || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата отправки">
              {selectedCard.shippingDate
                ? dayjs(selectedCard.shippingDate).format('DD.MM.YYYY')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Примечания">
              {selectedCard.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Почтовый ордер">
              {selectedCard.postalOrder || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Срок исполнения">
              {selectedCard.executionDeadline
                ? dayjs(selectedCard.executionDeadline).format('DD.MM.YYYY')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата закрытия">
              {selectedCard.closedAt
                ? dayjs(selectedCard.closedAt).format('DD.MM.YYYY HH:mm')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Комментарий при закрытии">
              {selectedCard.closedComment || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Создано">
              {dayjs(selectedCard.createdAt).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default observer(ClosedCardsPage)

