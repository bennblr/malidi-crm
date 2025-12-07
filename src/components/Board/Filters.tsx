'use client'

import { observer } from 'mobx-react-lite'
import { Input, Select, Button, Space } from 'antd'
import { boardStore } from '@/stores/boardStore'
import styles from './Filters.module.css'

function Filters() {
  return (
    <div className={styles.filters}>
      <Space wrap>
        <Input
          placeholder="Организация"
          value={boardStore.filters.organization}
          onChange={(e) =>
            boardStore.setFilter('organization', e.target.value || undefined)
          }
          style={{ width: 200 }}
          allowClear
        />
        <Input
          placeholder="Контакты"
          value={boardStore.filters.contacts}
          onChange={(e) =>
            boardStore.setFilter('contacts', e.target.value || undefined)
          }
          style={{ width: 200 }}
          allowClear
        />
        <Input
          placeholder="Адрес"
          value={boardStore.filters.deliveryAddress}
          onChange={(e) =>
            boardStore.setFilter('deliveryAddress', e.target.value || undefined)
          }
          style={{ width: 200 }}
          allowClear
        />
        <Input
          placeholder="Серийный номер"
          value={boardStore.filters.serialNumber}
          onChange={(e) =>
            boardStore.setFilter('serialNumber', e.target.value || undefined)
          }
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="Приоритет"
          value={boardStore.filters.priorityId}
          onChange={(value) =>
            boardStore.setFilter('priorityId', value || undefined)
          }
          style={{ width: 150 }}
          allowClear
        >
          {boardStore.priorities.map((priority) => (
            <Select.Option key={priority.id} value={priority.id}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  backgroundColor: priority.color,
                  borderRadius: '50%',
                  marginRight: 8,
                }}
              />
              {priority.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Колонка"
          value={boardStore.filters.columnId}
          onChange={(value) =>
            boardStore.setFilter('columnId', value || undefined)
          }
          style={{ width: 150 }}
          allowClear
        >
          {boardStore.columns.map((column) => (
            <Select.Option key={column.id} value={column.id}>
              {column.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Статус срока"
          value={
            boardStore.filters.executionDeadlineExpired !== undefined
              ? String(boardStore.filters.executionDeadlineExpired)
              : undefined
          }
          onChange={(value) =>
            boardStore.setFilter(
              'executionDeadlineExpired',
              value === undefined
                ? undefined
                : value === 'true'
            )
          }
          style={{ width: 150 }}
          allowClear
        >
          <Select.Option value="true">Истек срок</Select.Option>
          <Select.Option value="false">Срок не истек</Select.Option>
        </Select>
        <Select
          placeholder="Сортировка"
          value={boardStore.sortBy}
          onChange={(value) => boardStore.setSortBy(value)}
          style={{ width: 150 }}
        >
          <Select.Option value="priority">По приоритету</Select.Option>
          <Select.Option value="organization">По организации</Select.Option>
          <Select.Option value="createdAt">По дате создания</Select.Option>
          <Select.Option value="executionDeadline">По сроку исполнения</Select.Option>
        </Select>
        <Button onClick={() => boardStore.clearFilters()}>Очистить</Button>
      </Space>
    </div>
  )
}

export default observer(Filters)

