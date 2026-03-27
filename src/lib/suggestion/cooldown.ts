export class CooldownTracker {
  private entries = new Map<string, number>() // entity -> expiry timestamp
  private defaultTtl: number

  constructor(defaultTtlMs: number = 300_000) { // 5 minutes default
    this.defaultTtl = defaultTtlMs
  }

  private normalize(entity: string): string {
    return entity.toLowerCase().trim()
  }

  register(entity: string, ttlMs?: number): void {
    const key = this.normalize(entity)
    const expiry = Date.now() + (ttlMs ?? this.defaultTtl)
    this.entries.set(key, expiry)
  }

  isSuppressed(entity: string): boolean {
    const key = this.normalize(entity)
    const expiry = this.entries.get(key)
    if (expiry === undefined) return false
    if (Date.now() > expiry) {
      this.entries.delete(key)
      return false
    }
    return true
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, expiry] of this.entries) {
      if (now > expiry) {
        this.entries.delete(key)
      }
    }
  }

  getActive(): string[] {
    const now = Date.now()
    const active: string[] = []
    for (const [key, expiry] of this.entries) {
      if (now <= expiry) {
        active.push(key)
      }
    }
    return active
  }

  get size(): number {
    return this.entries.size
  }
}
