import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

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
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  // Previne que o autoFocus acione imediatamente o onBlur (falso positivo).
  const allowBlurRef = useRef(false)

  useLayoutEffect(() => {
    ref.current?.focus()
    const id = window.setTimeout(() => {
      allowBlurRef.current = true
    }, 50)
    return () => {
      window.clearTimeout(id)
      allowBlurRef.current = false
    }
  }, [])

  function commit(): void {
    const text = value.trim()
    if (text) props.onCommit(text)
    else props.onCancel()
  }

  return (
    <textarea
      ref={ref}
      autoFocus
      className="text-input-layer"
      aria-label="Texto da anotação"
      data-testid="editor-text-input"
      style={
        {
          left: props.x,
          top: props.y,
          color: props.color,
          fontSize: props.fontSizeCss,
          userSelect: 'text',
          WebkitUserSelect: 'text'
        } as CSSProperties
      }
      value={value}
      onChange={(e) => setValue(e.target.value)}
      rows={1}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          props.onCancel()
        }
      }}
      onBlur={() => {
        if (allowBlurRef.current) commit()
      }}
    />
  )
}
