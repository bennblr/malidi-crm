'use client'

import { observer } from 'mobx-react-lite'
import { useDroppable } from '@dnd-kit/core'
import { Column as ColumnType } from '@prisma/client'
import { boardStore } from '@/stores/boardStore'
import Card from './Card'
import styles from './Column.module.css'

interface ColumnProps {
  column: ColumnType
}

function Column({ column }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const cards = boardStore.getCardsByColumn(column.id)

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.over : ''}`}
    >
      <div className={styles.header}>
        <h3>{column.name}</h3>
        <span className={styles.count}>{cards.length}</span>
      </div>
      <div className={styles.cards}>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

export default observer(Column)

