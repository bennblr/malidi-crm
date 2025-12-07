'use client'

import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { boardStore } from '@/stores/boardStore'
import { settingsStore } from '@/stores/settingsStore'
import Board from '@/components/Board/Board'

function BoardPage() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Первоначальная загрузка
    boardStore.fetchCards()
    boardStore.fetchColumns()
    boardStore.fetchPriorities()
    settingsStore.fetchSettings()

    // Автоматическое обновление карточек каждые 10 секунд
    // Это обеспечит появление новых карточек из Telegram сразу после их создания
    intervalRef.current = setInterval(() => {
      boardStore.fetchCards(true) // forceRefresh = true, чтобы обойти клиентский кэш
    }, 10000) // 10 секунд

    // Обновление при возврате фокуса на вкладку
    const handleFocus = () => {
      boardStore.fetchCards(true)
    }
    window.addEventListener('focus', handleFocus)

    // Очистка интервала и слушателя при размонтировании компонента
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return <Board />
}

export default observer(BoardPage)

