import type { GalleryItem } from '@shared/types'

const SESSION_ITEM_LIMIT = 20

export class CaptureSession {
  private buffer: GalleryItem[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly getTimeoutMs: () => number,
    private readonly onComplete: (items: GalleryItem[]) => void
  ) {}

  addCapture(dataUrl: string, background?: string): void {
    this.buffer.push({
      index: this.buffer.length + 1,
      dataUrl,
      ...(background ? { background } : {})
    })

    if (this.buffer.length >= SESSION_ITEM_LIMIT) {
      this.flush()
      return
    }

    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.flush()
    }, this.getTimeoutMs())
  }

  clearSession(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.buffer = []
  }

  private flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const items = this.buffer
    this.buffer = []
    if (items.length >= 2) {
      this.onComplete(items)
    }
  }
}
