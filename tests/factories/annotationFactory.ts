import { faker } from '@faker-js/faker'
import type { Annotation, ShapeTool } from '@shared/types'

type ShapeAnnotation = Extract<Annotation, { kind: 'shape' }>
type TextAnnotation = Extract<Annotation, { kind: 'text' }>
type StepAnnotation = Extract<Annotation, { kind: 'step' }>
type BlurAnnotation = Extract<Annotation, { kind: 'blur' }>

function point(): { x: number; y: number } {
  return { x: faker.number.int({ min: 0, max: 1920 }), y: faker.number.int({ min: 0, max: 1080 }) }
}

export const annotationFactory = {
  shape(overrides: Partial<ShapeAnnotation> = {}): ShapeAnnotation {
    const tools: ShapeTool[] = ['rect', 'ellipse', 'arrow', 'line', 'highlight']
    return {
      kind: 'shape',
      tool: faker.helpers.arrayElement(tools),
      start: point(),
      end: point(),
      color: faker.color.rgb(),
      strokeWidth: faker.number.int({ min: 2, max: 8 }),
      ...overrides
    }
  },

  text(overrides: Partial<TextAnnotation> = {}): TextAnnotation {
    return {
      kind: 'text',
      ...point(),
      text: faker.lorem.words({ min: 1, max: 4 }),
      color: faker.color.rgb(),
      fontSize: faker.number.int({ min: 14, max: 36 }),
      ...overrides
    }
  },

  step(overrides: Partial<StepAnnotation> = {}): StepAnnotation {
    return {
      kind: 'step',
      ...point(),
      n: faker.number.int({ min: 1, max: 20 }),
      color: faker.color.rgb(),
      ...overrides
    }
  },

  blur(overrides: Partial<BlurAnnotation> = {}): BlurAnnotation {
    return {
      kind: 'blur',
      rect: {
        x: faker.number.int({ min: 0, max: 800 }),
        y: faker.number.int({ min: 0, max: 600 }),
        width: faker.number.int({ min: 20, max: 400 }),
        height: faker.number.int({ min: 20, max: 300 })
      },
      ...overrides
    }
  }
}
