import { makeAutoObservable, runInAction } from 'mobx'
import { Card, Column, Priority } from '@prisma/client'
import { loadingStore } from './loadingStore'

export interface CardWithRelations extends Card {
  priority: Priority
  column: Column
  user: {
    id: string
    email: string
  }
  // Явно указываем поля закрытия для совместимости с TypeScript во время билда
  isClosed: boolean
  closedAt: Date | null
  closedComment: string | null
  closedBy: string | null
}

interface Filters {
  organization?: string
  contacts?: string
  deliveryAddress?: string
  priorityId?: string
  columnId?: string
  executionDeadlineExpired?: boolean
}

export class BoardStore {
  cards: CardWithRelations[] = []
  columns: Column[] = []
  priorities: Priority[] = []
  filters: Filters = {}
  sortBy: string = 'priority'
  sortOrder: 'asc' | 'desc' = 'asc'
  loading = false
  error: string | null = null
  
  // Кэширование
  private cardsCache: CardWithRelations[] | null = null
  private cardsCacheTime: number | null = null
  private columnsCache: Column[] | null = null
  private columnsCacheTime: number | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 минут

  constructor() {
    makeAutoObservable(this)
  }

  async fetchCards(forceRefresh = false) {
    const now = Date.now()
    
    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh && this.cardsCache && this.cardsCacheTime) {
      const cacheAge = now - this.cardsCacheTime
      if (cacheAge < this.CACHE_DURATION) {
        // Преобразуем строки дат в Date объекты для кэша
        const cachedCardsWithDates = this.cardsCache.map((card: any) => ({
          ...card,
          createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt),
          updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt),
          shippingDate: card.shippingDate ? (card.shippingDate instanceof Date ? card.shippingDate : new Date(card.shippingDate)) : null,
          executionDeadline: card.executionDeadline ? (card.executionDeadline instanceof Date ? card.executionDeadline : new Date(card.executionDeadline)) : null,
          closedAt: card.closedAt ? (card.closedAt instanceof Date ? card.closedAt : new Date(card.closedAt)) : null,
        }))
        // Используем кэш
        runInAction(() => {
          this.cards = cachedCardsWithDates
        })
        return { fromCache: true }
      }
    }

    this.loading = true
    this.error = null
    try {
      const response = await fetch('/api/cards', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch cards')
      const data = await response.json()
      
      // Преобразуем строки дат в Date объекты
      const cardsWithDates = data.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        shippingDate: card.shippingDate ? new Date(card.shippingDate) : null,
        executionDeadline: card.executionDeadline ? new Date(card.executionDeadline) : null,
        closedAt: card.closedAt ? new Date(card.closedAt) : null,
      }))
      
      // Проверяем заголовок от сервера
      const fromCache = response.headers.get('X-From-Cache') === 'true'
      
      runInAction(() => {
        this.cards = cardsWithDates
        // Обновляем кэш только если данные не из кэша сервера
        if (!fromCache) {
          this.cardsCache = cardsWithDates
          this.cardsCacheTime = now
        }
        this.loading = false
      })
      
      return { fromCache: false }
    } catch (error: any) {
      // При ошибке используем кэш, если он есть
      if (this.cardsCache) {
        // Преобразуем строки дат в Date объекты для кэша тоже
        const cachedCardsWithDates = this.cardsCache.map((card: any) => ({
          ...card,
          createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt),
          updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt),
          shippingDate: card.shippingDate ? (card.shippingDate instanceof Date ? card.shippingDate : new Date(card.shippingDate)) : null,
          executionDeadline: card.executionDeadline ? (card.executionDeadline instanceof Date ? card.executionDeadline : new Date(card.executionDeadline)) : null,
          closedAt: card.closedAt ? (card.closedAt instanceof Date ? card.closedAt : new Date(card.closedAt)) : null,
        }))
        runInAction(() => {
          this.cards = cachedCardsWithDates
          this.loading = false
        })
        return { fromCache: true, error: error.message }
      }
      
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async fetchColumns(forceRefresh = false) {
    const now = Date.now()
    
    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh && this.columnsCache && this.columnsCacheTime) {
      const cacheAge = now - this.columnsCacheTime
      if (cacheAge < this.CACHE_DURATION) {
        // Используем кэш
        runInAction(() => {
          this.columns = this.columnsCache!
        })
        return { fromCache: true }
      }
    }

    try {
      const response = await fetch('/api/columns', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch columns')
      const data = await response.json()
      
      // Проверяем заголовок от сервера
      const fromCache = response.headers.get('X-From-Cache') === 'true'
      
      runInAction(() => {
        this.columns = data
        // Обновляем кэш только если данные не из кэша сервера
        if (!fromCache) {
          this.columnsCache = data
          this.columnsCacheTime = now
        }
      })
      
      return { fromCache: false }
    } catch (error: any) {
      // При ошибке используем кэш, если он есть
      if (this.columnsCache) {
        runInAction(() => {
          this.columns = this.columnsCache!
        })
        return { fromCache: true, error: error.message }
      }
      
      runInAction(() => {
        this.error = error.message
      })
      throw error
    }
  }

  async fetchPriorities() {
    try {
      const response = await fetch('/api/priorities')
      if (!response.ok) throw new Error('Failed to fetch priorities')
      const data = await response.json()
      runInAction(() => {
        this.priorities = data
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
    }
  }

  async moveCard(cardId: string, newColumnId: string) {
    loadingStore.startLoading()
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: newColumnId }),
      })
      if (!response.ok) throw new Error('Failed to move card')
      const updatedCard = await response.json()
      
      // Очищаем кэш и обновляем данные
      this.cardsCache = null
      this.cardsCacheTime = null
      
      // Обновляем карточки с принудительным обновлением
      await this.fetchCards(true)
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
    } finally {
      loadingStore.stopLoading()
    }
  }

  async updateCard(cardId: string, data: Partial<Card>) {
    loadingStore.startLoading()
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update card')
      const updatedCard = await response.json()
      
      // Очищаем кэш и обновляем данные
      this.cardsCache = null
      this.cardsCacheTime = null
      
      // Обновляем карточки с принудительным обновлением
      await this.fetchCards(true)
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
    } finally {
      loadingStore.stopLoading()
    }
  }

  async closeCard(cardId: string, comment: string) {
    loadingStore.startLoading()
    try {
      const response = await fetch(`/api/cards/${cardId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
      if (!response.ok) throw new Error('Failed to close card')
      const updatedCard = await response.json()
      
      // Очищаем кэш и обновляем данные
      this.cardsCache = null
      this.cardsCacheTime = null
      
      // Обновляем список карточек с принудительным обновлением
      await this.fetchCards(true)
      
      loadingStore.stopLoading()
      return updatedCard
    } catch (error: any) {
      loadingStore.stopLoading()
      throw error
    }
  }

  setFilter(key: keyof Filters, value: any) {
    this.filters[key] = value
  }

  clearFilters() {
    this.filters = {}
  }

  setSortBy(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      this.sortBy = field
      this.sortOrder = 'asc'
    }
  }

  get visibleColumns() {
    return this.columns.filter((col) => col.isVisible).sort((a, b) => a.order - b.order)
  }

  get filteredAndSortedCards() {
    let filtered = [...this.cards]

    // Применяем фильтры
    if (this.filters.organization) {
      filtered = filtered.filter((card) =>
        card.organization
          .toLowerCase()
          .includes(this.filters.organization!.toLowerCase())
      )
    }
    if (this.filters.contacts) {
      filtered = filtered.filter((card) =>
        card.contacts.toLowerCase().includes(this.filters.contacts!.toLowerCase())
      )
    }
    if (this.filters.deliveryAddress) {
      filtered = filtered.filter((card) =>
        card.deliveryAddress
          .toLowerCase()
          .includes(this.filters.deliveryAddress!.toLowerCase())
      )
    }
    if (this.filters.priorityId) {
      filtered = filtered.filter((card) => card.priorityId === this.filters.priorityId)
    }
    if (this.filters.columnId) {
      filtered = filtered.filter((card) => card.columnId === this.filters.columnId)
    }
    if (this.filters.executionDeadlineExpired !== undefined) {
      const now = new Date()
      filtered = filtered.filter((card) => {
        if (!card.executionDeadline) return false
        const expired = now > new Date(card.executionDeadline)
        return expired === this.filters.executionDeadlineExpired
      })
    }

    // Применяем сортировку
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (this.sortBy) {
        case 'priority':
          aValue = a.priority.order
          bValue = b.priority.order
          break
        case 'organization':
          aValue = a.organization.toLowerCase()
          bValue = b.organization.toLowerCase()
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'executionDeadline':
          aValue = a.executionDeadline
            ? new Date(a.executionDeadline).getTime()
            : 0
          bValue = b.executionDeadline
            ? new Date(b.executionDeadline).getTime()
            : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  getCardsByColumn(columnId: string) {
    return this.filteredAndSortedCards
      .filter((card) => card.columnId === columnId)
      .sort((a, b) => {
        // Сортировка по приоритету внутри колонки
        return a.priority.order - b.priority.order
      })
  }
}

export const boardStore = new BoardStore()

