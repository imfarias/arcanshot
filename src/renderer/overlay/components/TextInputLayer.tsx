import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export interface TextInputLayerProps {
  /** posição em CSS px dentro do overlay */
  x: number
  y: number
  color: string
  fontSizeCss: number
  onCommit: (text: string) => void
  onCancel: () => void
}

export function TextInputLayer(props: TextInputLayerProps): ReactNode {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <textarea
      ref={ref}
      className="text-input-layer"
      aria-label="Texto da anotação"
      data-testid="editor-text-input"
      style={{
        left: props.x,
        top: props.y,
        color: props.color,
        fontSize: props.fontSizeCss
      }}
      rows={1}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          const value = e.currentTarget.value.trim()
          if (value) props.onCommit(value)
          else props.onCancel()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          props.onCancel()
        }
      }}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim()
        if (value) props.onCommit(value)
        else props.onCancel()
      }}
    />
  )
}
