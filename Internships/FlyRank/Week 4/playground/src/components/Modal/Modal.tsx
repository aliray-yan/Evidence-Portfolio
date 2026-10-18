import {
  useEffect,
  useId,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useScrollLock } from '../../hooks/useScrollLock'
import styles from './Modal.module.css'

export interface ModalProps {
  /** Whether the dialog is currently open. */
  isOpen: boolean
  /** Called when the dialog should close (Escape key, overlay click, close button). */
  onClose: () => void
  /** Visible dialog title, used to build the accessible name via aria-labelledby. */
  title: string
  /** Dialog body content. */
  children: ReactNode
  /**
   * Id of an element (usually a paragraph inside the dialog) that describes
   * the dialog further, wired up via aria-describedby.
   */
  describedById?: string
  /**
   * Element that should receive focus when the dialog opens. Defaults to the
   * first focusable element inside the dialog, per the APG pattern.
   */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Closes the dialog when the overlay (area outside the dialog) is clicked. Defaults to true. */
  closeOnOverlayClick?: boolean
  className?: string
}

/**
 * Modal Dialog implementing the WAI-ARIA Authoring Practices Guide
 * "Dialog (Modal)" pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * - role="dialog" + aria-modal="true" + aria-labelledby
 * - Focus moves into the dialog on open and is trapped there
 * - Escape closes the dialog
 * - Focus returns to the triggering element on close
 * - Background content is inert (unclickable and hidden from assistive tech)
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  describedById,
  initialFocusRef,
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  useFocusTrap({ active: isOpen, containerRef: dialogRef, initialFocusRef })
  useScrollLock(isOpen)

  // Store the triggering element when the dialog opens, and restore focus to
  // it when the dialog closes. This effect intentionally reacts to `isOpen`
  // transitions rather than mount/unmount, since the component stays mounted
  // (returning null while closed) so this ref survives across toggles.
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null
    } else if (previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus()
      previouslyFocusedElement.current = null
    }
  }, [isOpen])

  // Make the rest of the page inert while the dialog is open: it can't be
  // clicked, and it's hidden from screen readers, satisfying "prevent
  // interaction with the background".
  useEffect(() => {
    if (!isOpen) return

    const overlay = overlayRef.current
    const siblings = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== overlay,
    )

    const restoreFns = siblings.map((el) => {
      const hadInert = el.inert
      const hadAriaHidden = el.getAttribute('aria-hidden')
      el.inert = true
      el.setAttribute('aria-hidden', 'true')
      return () => {
        el.inert = hadInert
        if (hadAriaHidden === null) {
          el.removeAttribute('aria-hidden')
        } else {
          el.setAttribute('aria-hidden', hadAriaHidden)
        }
      }
    })

    return () => {
      restoreFns.forEach((restore) => restore())
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    // This overlay is a click-outside-to-dismiss backdrop, not an
    // interactive control in its own right; it has no role and is never
    // part of the tab order. All keyboard interaction happens on the dialog
    // and its contents.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        tabIndex={-1}
        className={`${styles.dialog} ${className ?? ''}`}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
