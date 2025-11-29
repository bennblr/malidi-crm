'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { boardStore } from '@/stores/boardStore'
import Board from '@/components/Board/Board'

function BoardPage() {
  useEffect(() => {
    boardStore.fetchCards()
    boardStore.fetchColumns()
    boardStore.fetchPriorities()
  }, [])

  return <Board />
}

export default observer(BoardPage)

