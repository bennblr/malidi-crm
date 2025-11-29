import { makeAutoObservable, runInAction } from 'mobx'
import { Column, Priority } from '@prisma/client'

export class SettingsStore {
  priorities: Priority[] = []
  columns: Column[] = []
  settings: Record<string, string> = {}
  loading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchPriorities() {
    this.loading = true
    try {
      const response = await fetch('/api/priorities')
      if (!response.ok) throw new Error('Failed to fetch priorities')
      const data = await response.json()
      runInAction(() => {
        this.priorities = data
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
    this.loading = true
    try {
      const response = await fetch('/api/columns')
      if (!response.ok) throw new Error('Failed to fetch columns')
      const data = await response.json()
      runInAction(() => {
        this.columns = data
        this.loading = false
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
    }
  }

  async fetchSettings() {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      runInAction(() => {
        this.settings = data
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
    }
  }

  async createPriority(name: string, color: string, order: number) {
    this.loading = true
    try {
      const response = await fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, order }),
      })
      if (!response.ok) throw new Error('Failed to create priority')
      const newPriority = await response.json()
      runInAction(() => {
        this.priorities.push(newPriority)
        this.priorities.sort((a, b) => a.order - b.order)
        this.loading = false
      })
      return newPriority
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async updatePriority(id: string, data: Partial<Priority>) {
    this.loading = true
    try {
      const response = await fetch(`/api/priorities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update priority')
      const updatedPriority = await response.json()
      runInAction(() => {
        const index = this.priorities.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.priorities[index] = updatedPriority
        }
        this.priorities.sort((a, b) => a.order - b.order)
        this.loading = false
      })
      return updatedPriority
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async deletePriority(id: string) {
    this.loading = true
    try {
      const response = await fetch(`/api/priorities/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete priority')
      runInAction(() => {
        this.priorities = this.priorities.filter((p) => p.id !== id)
        this.loading = false
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async createColumn(name: string, order: number, isVisible: boolean, yellowLimit: number | null, redLimit: number | null) {
    this.loading = true
    try {
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, order, isVisible, yellowLimit, redLimit }),
      })
      if (!response.ok) throw new Error('Failed to create column')
      const newColumn = await response.json()
      runInAction(() => {
        this.columns.push(newColumn)
        this.columns.sort((a, b) => a.order - b.order)
        this.loading = false
      })
      return newColumn
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async updateColumn(id: string, data: Partial<Column>) {
    this.loading = true
    try {
      const response = await fetch(`/api/columns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update column')
      const updatedColumn = await response.json()
      runInAction(() => {
        const index = this.columns.findIndex((c) => c.id === id)
        if (index !== -1) {
          this.columns[index] = updatedColumn
        }
        this.columns.sort((a, b) => a.order - b.order)
        this.loading = false
      })
      return updatedColumn
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async deleteColumn(id: string) {
    this.loading = true
    try {
      const response = await fetch(`/api/columns/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete column')
      runInAction(() => {
        this.columns = this.columns.filter((c) => c.id !== id)
        this.loading = false
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async reorderColumns(columns: { id: string; order: number }[]) {
    this.loading = true
    try {
      const response = await fetch('/api/columns/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns }),
      })
      if (!response.ok) throw new Error('Failed to reorder columns')
      await this.fetchColumns()
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async updateSettings(settings: Record<string, string>) {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error('Failed to update settings')
      runInAction(() => {
        this.settings = { ...this.settings, ...settings }
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
      })
      throw error
    }
  }
}

export const settingsStore = new SettingsStore()

