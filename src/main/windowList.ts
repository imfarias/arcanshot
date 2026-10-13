import type { RawWindow } from '@shared/windowPick'

// Lista as janelas abertas pelo user32/dwmapi (0011), via koffi (binário pré-compilado, N-API).
// Carregado sob demanda: sem Windows, sem a biblioteca ou com qualquer erro nativo a lista é
// vazia e a captura segue sem o recurso — nunca derruba o atalho principal.

const DWMWA_EXTENDED_FRAME_BOUNDS = 9
const DWMWA_CLOAKED = 14
const GWL_EXSTYLE = -20

interface Native {
  enumerate(): RawWindow[]
}

let native: Native | null | undefined

function load(): Native | null {
  if (native !== undefined) return native
  native = null
  if (process.platform !== 'win32') return native
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi') as typeof import('koffi')
    const user32 = koffi.load('user32.dll')
    const dwm = koffi.load('dwmapi.dll')
    // registrada pelo nome e referenciada nas assinaturas abaixo
    koffi.struct('RECT', {
      left: 'int32',
      top: 'int32',
      right: 'int32',
      bottom: 'int32'
    })
    const EnumProc = koffi.proto('bool __stdcall EnumProc(intptr_t hwnd, intptr_t lparam)')
    const EnumWindows = user32.func('bool __stdcall EnumWindows(EnumProc *cb, intptr_t lparam)')
    const IsWindowVisible = user32.func('bool __stdcall IsWindowVisible(intptr_t hwnd)')
    const IsIconic = user32.func('bool __stdcall IsIconic(intptr_t hwnd)')
    const GetWindowTextW = user32.func(
      'int __stdcall GetWindowTextW(intptr_t hwnd, _Out_ uint16_t *buf, int max)'
    )
    const GetClassNameW = user32.func(
      'int __stdcall GetClassNameW(intptr_t hwnd, _Out_ uint16_t *buf, int max)'
    )
    const GetWindowLongW = user32.func('int32 __stdcall GetWindowLongW(intptr_t hwnd, int idx)')
    const GetWindowRect = user32.func('bool __stdcall GetWindowRect(intptr_t hwnd, _Out_ RECT *r)')
    const DwmRect = dwm.func(
      'int32 __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32 attr, _Out_ RECT *pv, uint32 cb)'
    )
    const DwmInt = dwm.func(
      'int32 __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32 attr, _Out_ int32 *pv, uint32 cb)'
    )

    const text = (read: (buf: Buffer, max: number) => number): string => {
      const buf = Buffer.alloc(1024)
      const n = read(buf, 512)
      return n > 0 ? buf.toString('utf16le', 0, n * 2) : ''
    }

    native = {
      enumerate(): RawWindow[] {
        const out: RawWindow[] = []
        const callback = koffi.register((hwnd: number): boolean => {
          try {
            if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) return true
            const cloaked = [0]
            DwmInt(hwnd, DWMWA_CLOAKED, cloaked, 4) // UWP "fantasma" e janelas de outro desktop virtual
            if (cloaked[0] !== 0) return true

            // Borda visível (sem as bordas invisíveis de redimensionamento do Windows 10/11)
            const r = { left: 0, top: 0, right: 0, bottom: 0 }
            if (DwmRect(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, r, 16) !== 0) GetWindowRect(hwnd, r)
            out.push({
              handle: hwnd,
              title: text((buf, max) => GetWindowTextW(hwnd, buf, max)),
              className: text((buf, max) => GetClassNameW(hwnd, buf, max)),
              exStyle: GetWindowLongW(hwnd, GWL_EXSTYLE) >>> 0,
              rect: { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top }
            })
          } catch {
            // uma janela problemática não pode interromper a enumeração
          }
          return true
        }, koffi.pointer(EnumProc))
        try {
          EnumWindows(callback, 0)
        } finally {
          koffi.unregister(callback)
        }
        return out
      }
    }
  } catch {
    native = null
  }
  return native
}

/** Janelas de nível superior visíveis, de cima para baixo, em pixels físicos. Nunca lança. */
export function listWindows(): RawWindow[] {
  try {
    return load()?.enumerate() ?? []
  } catch {
    return []
  }
}
