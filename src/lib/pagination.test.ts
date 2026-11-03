import { describe, expect, it } from 'vitest'
import { pageItems } from './pagination'

describe('pageItems', () => {
  it('lists every page up to seven', () => {
    expect(pageItems(0, 1)).toEqual([0])
    expect(pageItems(1, 2)).toEqual([0, 1])
    expect(pageItems(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('collapses the far end near the start', () => {
    expect(pageItems(0, 12)).toEqual([0, 1, 2, 3, 4, 'gap', 11])
    expect(pageItems(3, 12)).toEqual([0, 1, 2, 3, 4, 'gap', 11])
  })

  it('collapses both sides in the middle', () => {
    expect(pageItems(4, 12)).toEqual([0, 'gap', 3, 4, 5, 'gap', 11])
    expect(pageItems(7, 12)).toEqual([0, 'gap', 6, 7, 8, 'gap', 11])
  })

  it('collapses the near end close to the last page', () => {
    expect(pageItems(8, 12)).toEqual([0, 'gap', 7, 8, 9, 10, 11])
    expect(pageItems(11, 12)).toEqual([0, 'gap', 7, 8, 9, 10, 11])
  })

  it('always has seven items past seven pages', () => {
    for (let current = 0; current < 20; current++) expect(pageItems(current, 20)).toHaveLength(7)
  })
})
