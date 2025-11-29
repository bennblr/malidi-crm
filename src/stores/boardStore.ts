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

  constructor() {
    makeAutoObservable(this)
  }

  async fetchCards() {
    this.loading = true
    this.error = null
    try {
      const response = await fetch('/api/cards')
      if (!response.ok) throw new Error('Failed to fetch cards')
      const data = await response.json()
      runInAction(() => {
        this.cards = data
        this.loading = false
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
    }
  }

  async fetchColumns() {
    try {
      const response = await fetch('/api/columns')
      if (!response.ok) throw new Error('Failed to fetch columns')
      const data = await response.json()
      runInAction(() => {
        this.columns = data
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
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
      
      runInAction(() => {
        const index = this.cards.findIndex((c) => c.id === cardId)
        if (index !== -1) {
          this.cards[index] = updatedCard
        }
      })
      
      // Обновляем карточки без установки loading, так как loadingStore уже активен
      const cardsResponse = await fetch('/api/cards')
      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json()
        runInAction(() => {
          this.cards = cardsData
        })
      }
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
      
      runInAction(() => {
        const index = this.cards.findIndex((c) => c.id === cardId)
        if (index !== -1) {
          this.cards[index] = updatedCard
        }
      })
      
      // Обновляем карточки без установки loading, так как loadingStore уже активен
      const cardsResponse = await fetch('/api/cards')
      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json()
        runInAction(() => {
          this.cards = cardsData
        })
      }
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
    } finally {
      loadingStore.stopLoading()
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

