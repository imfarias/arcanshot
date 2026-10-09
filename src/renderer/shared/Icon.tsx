import type { ReactNode } from 'react'

// Ícones desenhados para o ArcanShot (os mesmos do site): grade 24×24, traço 1.75,
// pontas e junções arredondadas. Cor vem de currentColor.
const PATHS = {
  select: <path d="M5 5h14v14H5z" strokeDasharray="2.6 2.4" />,
  rect: <rect x="4" y="6" width="16" height="12" rx="1.5" />,
  ellipse: <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />,
  arrow: (
    <>
      <path d="M5 19 18.5 5.5" />
      <path d="M10 5h9v9" />
    </>
  ),
  line: <path d="M5 19 19 5" />,
  pencil: (
    <>
      <path d="M4.5 19.5 5.5 15 16 4.5a2.1 2.1 0 0 1 3 3L8.5 18z" />
      <path d="m14 6.5 3 3" />
    </>
  ),
  highlight: (
    <>
      <path d="m15 3.5 5 5-7.5 7.5H8.5v-4z" />
      <path d="M8.5 16 6 18.5" />
      <path d="M11 20.5h9" />
    </>
  ),
  blur: (
    <g fill="currentColor" stroke="none">
      <circle cx="6" cy="6" r="1.9" />
      <circle cx="12" cy="6" r="1.4" />
      <circle cx="18" cy="6" r="0.9" />
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18" cy="12" r="1.4" />
      <circle cx="6" cy="18" r="0.9" />
      <circle cx="12" cy="18" r="1.4" />
      <circle cx="18" cy="18" r="1.9" />
    </g>
  ),
  redact: (
    <>
      <path d="M4 5.5h10M4 18.5h13" />
      <rect x="3.5" y="9" width="17" height="6" rx="1" fill="currentColor" />
    </>
  ),
  text: (
    <>
      <path d="M5.5 7V5h13v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </>
  ),
  step: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.3 9.6 12.6 8v8" />
    </>
  ),
  eyedropper: (
    <>
      <path d="M16.2 4.3a2.2 2.2 0 0 1 3.1 3.1L16.8 10l-3.1-3.1z" />
      <path d="m12.5 5.5 6 6" />
      <path d="M14.8 8.6 6.5 16.9 5.5 19l2.1-1L15.9 9.7" />
    </>
  ),
  undo: (
    <>
      <path d="M9 13.5 4.5 9 9 4.5" />
      <path d="M4.5 9H15a4.75 4.75 0 0 1 0 9.5h-4" />
    </>
  ),
  redo: (
    <>
      <path d="M15 13.5 19.5 9 15 4.5" />
      <path d="M19.5 9H9a4.75 4.75 0 0 0 0 9.5h4" />
    </>
  ),
  beautify: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <rect x="7.5" y="8" width="9" height="8" rx="1" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  save: (
    <>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  folder: (
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
  ),
  file: (
    <>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 13h6M9 16.5h4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20 }: { name: IconName; size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
