'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Spin } from 'antd'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { boardStore } from '@/stores/boardStore'
import { loadingStore } from '@/stores/loadingStore'
import Column from './Column'
import Card from './Card'
import Filters from './Filters'
import styles from './Board.module.css'

function Board() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    // Проверяем, перемещается ли карточка между колонками
    const activeCard = boardStore.cards.find((c) => c.id === active.id)
    const overColumn = boardStore.columns.find((c) => c.id === over.id)

    if (activeCard && overColumn && activeCard.columnId !== overColumn.id) {
      await boardStore.moveCard(activeCard.id, overColumn.id)
    }
  }

  const activeCard = activeId
    ? boardStore.cards.find((c) => c.id === activeId)
    : null

  // Лоадер показывается при изменениях (loadingStore) или начальной загрузке (boardStore.loading)
  const isLoading = loadingStore.isLoading || boardStore.loading

  return (
    <Spin spinning={isLoading} tip="Загрузка...">
      <div className={styles.board}>
        <div className={styles.header}>
          <Filters />
        </div>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          autoScroll={false}
        >
          <div 
            className={styles.columns} 
            onWheel={(e) => {
              const target = e.currentTarget
              if (target.scrollHeight > target.clientHeight || target.scrollWidth > target.clientWidth) {
                e.stopPropagation()
              }
            }}
            style={{ overflow: 'scroll' }}
          >
            {boardStore.visibleColumns.map((column) => {
              const columnCards = boardStore.getCardsByColumn(column.id)
              return (
                <SortableContext
                  key={column.id}
                  id={column.id}
                  items={columnCards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Column column={column} />
                </SortableContext>
              )
            })}
          </div>
          <DragOverlay>
            {activeCard ? (
              <div style={{ opacity: 0.5 }}>
                <Card card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </Spin>
  )
}

export default observer(Board)

