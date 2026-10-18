import { useEffect } from 'react'

/**
 * Prevents the page behind a modal from scrolling while `locked` is true.
 * Restores the previous inline style on cleanup so nested/sequential locks
 * don't clobber each other's original values.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return

    const { body } = document
    const previousOverflow = body.style.overflow

    body.style.overflow = 'hidden'

    return () => {
      body.style.overflow = previousOverflow
    }
  }, [locked])
}
