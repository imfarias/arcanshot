import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

export interface HotkeyInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'data-testid'?: string
}

const IGNORED_KEYS = [
  'Control', 'Alt', 'Shift', 'Meta', 'OS',
  'CapsLock', 'NumLock', 'ScrollLock', 'Dead'
]

const SPECIAL_KEY_MAP: Record<string, string> = {
  PrintScreen: 'PrintScreen',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Enter: 'Return',
  ' ': 'Space',
  Escape: 'Escape'
}

function mapKey(domKey: string): string | null {
  if (SPECIAL_KEY_MAP[domKey]) return SPECIAL_KEY_MAP[domKey]
  if (/^F\d{1,2}$/.test(domKey)) return domKey
  if (domKey.length === 1) return domKey.toUpperCase()
  return null
}

function buildAccelerator(e: KeyboardEvent<HTMLInputElement>): string | null {
  if (IGNORED_KEYS.includes(e.key)) return null

  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Super')

  const key = mapKey(e.key)
  if (!key) return null
  parts.push(key)

  return parts.join('+')
}

export function HotkeyInput(props: HotkeyInputProps): ReactNode {
  const [capturing, setCapturing] = useState(false)

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setCapturing(false)
      return
    }

    const accelerator = buildAccelerator(e)
    if (accelerator) {
      props.onChange(accelerator)
      setCapturing(false)
    }
  }

  return (
    <input
      id={props.id}
      type="text"
      readOnly
      value={capturing ? '' : props.value}
      placeholder={capturing ? 'Pressione a tecla…' : undefined}
      aria-label={capturing ? 'Pressione a combinação de teclas desejada' : undefined}
      aria-describedby={props['aria-describedby']}
      aria-invalid={props['aria-invalid']}
      data-testid={props['data-testid']}
      onFocus={() => setCapturing(true)}
      onBlur={() => setCapturing(false)}
      onKeyDown={handleKeyDown}
    />
  )
}
