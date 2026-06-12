import 'vitest'

declare module 'vitest' {
  interface Assertion<T> {
    toHaveNoViolations(): T
  }
}
