import { describe, it, expect } from '@jest/globals'
import { statsFilterSchema } from './statsFilter.schema'

// thin wrapper so tests read clearly
const parse = (query: Record<string, string>) =>
  statsFilterSchema.safeParse({ query })

describe('statsFilterSchema', () => {
  describe('valid inputs', () => {
    it('passes with no params (default behaviour)', () => {
      expect(parse({}).success).toBe(true)
    })

    it('passes with mode=lastN and a valid lastN', () => {
      expect(parse({ mode: 'lastN', lastN: '25' }).success).toBe(true)
    })

    it('passes with a complete dateRange', () => {
      expect(
        parse({
          mode: 'dateRange',
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        }).success,
      ).toBe(true)
    })

    it('passes with minScore alongside lastN', () => {
      expect(
        parse({ mode: 'lastN', lastN: '50', minScore: '100' }).success,
      ).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('fails when mode=lastN but lastN is absent', () => {
      const result = parse({ mode: 'lastN' })
      expect(result.success).toBe(false)
      expect(JSON.stringify(result.error)).toContain('lastN')
    })

    it('fails when mode=dateRange but dateFrom is missing', () => {
      const result = parse({ mode: 'dateRange', dateTo: '2025-12-31' })
      expect(result.success).toBe(false)
      expect(JSON.stringify(result.error)).toContain('dateFrom')
    })

    it('fails when mode=dateRange but dateTo is missing', () => {
      const result = parse({ mode: 'dateRange', dateFrom: '2025-01-01' })
      expect(result.success).toBe(false)
      expect(JSON.stringify(result.error)).toContain('dateTo')
    })

    it('fails with an unrecognised mode value', () => {
      expect(parse({ mode: 'all' }).success).toBe(false)
    })

    it('fails when lastN is not a positive integer', () => {
      expect(parse({ mode: 'lastN', lastN: '0' }).success).toBe(false)
      expect(parse({ mode: 'lastN', lastN: '-5' }).success).toBe(false)
      expect(parse({ mode: 'lastN', lastN: 'abc' }).success).toBe(false)
    })

    it('fails when dateFrom is not a valid ISO date', () => {
      const result = parse({
        mode: 'dateRange',
        dateFrom: 'not-a-date',
        dateTo: '2025-12-31',
      })
      expect(result.success).toBe(false)
    })
  })
})
