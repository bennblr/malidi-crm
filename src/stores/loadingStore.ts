import { makeAutoObservable } from 'mobx'

class LoadingStore {
  isLoading = false
  loadingCount = 0

  constructor() {
    makeAutoObservable(this)
  }

  startLoading() {
    this.loadingCount++
    this.isLoading = true
  }

  stopLoading() {
    this.loadingCount = Math.max(0, this.loadingCount - 1)
    if (this.loadingCount === 0) {
      this.isLoading = false
    }
  }

  reset() {
    this.loadingCount = 0
    this.isLoading = false
  }
}

export const loadingStore = new LoadingStore()

