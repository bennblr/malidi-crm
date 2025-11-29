import { makeAutoObservable, runInAction } from 'mobx'

export interface User {
  id: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export class UserStore {
  users: User[] = []
  currentUser: User | null = null
  loading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchUsers() {
    this.loading = true
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      runInAction(() => {
        this.users = data
        this.loading = false
      })
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
    }
  }

  async createUser(email: string, password: string, role: string) {
    this.loading = true
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }
      const newUser = await response.json()
      runInAction(() => {
        this.users.push(newUser)
        this.loading = false
      })
      return newUser
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async updateUser(id: string, data: Partial<User & { password?: string }>) {
    this.loading = true
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update user')
      const updatedUser = await response.json()
      runInAction(() => {
        const index = this.users.findIndex((u) => u.id === id)
        if (index !== -1) {
          this.users[index] = updatedUser
        }
        this.loading = false
      })
      return updatedUser
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message
        this.loading = false
      })
      throw error
    }
  }

  async deleteUser(id: string) {
    this.loading = true
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }
      runInAction(() => {
        this.users = this.users.filter((u) => u.id !== id)
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

  setCurrentUser(user: User | null) {
    this.currentUser = user
  }
}

export const userStore = new UserStore()

