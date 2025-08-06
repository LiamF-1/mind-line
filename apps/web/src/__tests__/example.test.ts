import { describe, it, expect } from 'vitest'

describe('Example Test Suite', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should validate project setup', () => {
    const projectName = 'mind-line'
    expect(projectName).toBe('mind-line')
  })
})
