import { describe, expect, it } from 'vitest'
import {
  addAnnotation,
  canRedo,
  canUndo,
  createEditorState,
  nextStepNumber,
  redo,
  undo
} from '../../src/renderer/overlay/lib/editor'
import { annotationFactory } from '../factories/annotationFactory'

describe('editor state (CT-UN-08)', () => {
  it('add/undo/redo restaura estados exatos', () => {
    const a1 = annotationFactory.shape({ tool: 'rect' })
    const a2 = annotationFactory.text()

    let state = createEditorState()
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)

    state = addAnnotation(state, a1)
    state = addAnnotation(state, a2)
    expect(state.annotations).toEqual([a1, a2])

    state = undo(state)
    expect(state.annotations).toEqual([a1])
    expect(canRedo(state)).toBe(true)

    state = redo(state)
    expect(state.annotations).toEqual([a1, a2])
  })

  it('undo em estado vazio é no-op', () => {
    const state = createEditorState()
    expect(undo(state)).toBe(state)
    expect(redo(state)).toBe(state)
  })

  it('nova anotação após undo limpa o redo', () => {
    let state = createEditorState()
    state = addAnnotation(state, annotationFactory.shape())
    state = undo(state)
    state = addAnnotation(state, annotationFactory.blur())
    expect(canRedo(state)).toBe(false)
  })
})

describe('numeração passo-a-passo (CT-UN-09, CT-UN-10 — RN5)', () => {
  it('é sequencial e retrocede no undo', () => {
    let state = createEditorState()
    expect(nextStepNumber(state)).toBe(1)

    state = addAnnotation(state, annotationFactory.step({ n: 1 }))
    state = addAnnotation(state, annotationFactory.step({ n: 2 }))
    state = addAnnotation(state, annotationFactory.step({ n: 3 }))
    expect(nextStepNumber(state)).toBe(4)

    state = undo(state)
    expect(nextStepNumber(state)).toBe(3)
  })

  it('conta apenas anotações de step', () => {
    let state = createEditorState()
    state = addAnnotation(state, annotationFactory.shape())
    state = addAnnotation(state, annotationFactory.text())
    expect(nextStepNumber(state)).toBe(1)
  })
})
