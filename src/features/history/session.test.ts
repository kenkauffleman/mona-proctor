import { describe, expect, it, vi } from 'vitest'
import { createSessionId } from './session'

describe('createSessionId', () => {
  it('delegates to the browser crypto UUID generator', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(uuid)

    expect(createSessionId()).toBe(uuid)
    expect(spy).toHaveBeenCalledOnce()

    spy.mockRestore()
  })
})
