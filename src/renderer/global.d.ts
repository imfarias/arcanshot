import type { ArcanshotApi } from '@shared/types'

declare global {
  interface Window {
    arcanshot: ArcanshotApi
  }
}

export {}
