import { useEffect, type RefObject } from 'react'
import { getFocusableElements } from '../utils/focusableElements'

interface UseFocusTrapOptions {
  /** Whether the trap is currently active. */
  active: boolean
  /** Ref to the container that focus should be trapped within. */
  containerRef: RefObject<HTMLElement | null>
  /**
   * Ref to a specific element that should receive focus when the trap
   * activates. Falls back to the first focusable element in the container,
   * and finally to the container itself.
   */
  initialFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Traps Tab / Shift+Tab focus cycling within a container, per the "focus
 * trap" requirement of the WAI-ARIA APG Dialog (Modal) pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * This hook only handles keyboard (Tab) cycling. Moving focus into the
 * dialog on open, and restoring it on close, is handled by the Modal
 * component itself so it can coordinate with the trigger element.
 */
export function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
}: UseFocusTrapOptions): void {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const focusInitialElement = () => {
      const explicit = initialFocusRef?.current
      if (explicit) {
        explicit.focus()
        return
      }
      const focusable = getFocusableElements(container)
      if (focusable.length > 0) {
        focusable[0]?.focus()
      } else {
        // No focusable descendants: focus the dialog container itself so
        // keyboard and screen reader users still land somewhere sensible.
        container.focus()
      }
    }

    // Defer to the next tick so the dialog's contents have finished
    // mounting/painting before we try to move focus into them.
    const raf = requestAnimationFrame(focusInitialElement)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        // Nothing to tab between; keep focus pinned on the container.
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault()
          last?.focus()
        }
      } else {
        if (activeElement === last || !container.contains(activeElement)) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, containerRef, initialFocusRef])
}
