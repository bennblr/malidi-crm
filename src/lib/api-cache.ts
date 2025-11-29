/**
 * Простое кэширование в памяти для API endpoints
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 минут

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.DEFAULT_TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const age = Date.now() - entry.timestamp
    if (age > this.DEFAULT_TTL) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

export const apiCache = new ApiCache()

