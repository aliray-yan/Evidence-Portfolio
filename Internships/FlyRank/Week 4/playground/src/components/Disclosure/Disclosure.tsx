import type { ReactNode } from 'react'
import styles from './Disclosure.module.css'

export type HeadingLevel = 2 | 3 | 4 | 5 | 6

export interface DisclosureProps {
  /** Unique id used to derive the trigger button's and panel's DOM ids. */
  id: string
  /** Label shown on the trigger button. */
  summary: ReactNode
  /** Collapsible content. */
  children: ReactNode
  /** Controlled open state. Omit to let Disclosure manage its own state via defaultOpen. */
  isOpen: boolean
  /** Called when the user toggles the disclosure open/closed. */
  onToggle: (isOpen: boolean) => void
  /**
   * Heading level wrapping the trigger, so disclosures form a correct
   * document outline when several appear on one page (e.g. in an Accordion).
   */
  headingLevel?: HeadingLevel
  className?: string
}

/**
 * Disclosure (show/hide) widget per the WAI-ARIA APG Disclosure pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 * - A native <button> gives Enter/Space activation for free.
 * - aria-expanded reflects open state; aria-controls references the panel.
 * - The panel is a plain, non-landmark <div> (adding role="region" to every
 *   item in a long accordion would clutter screen reader landmark
 *   navigation, per APG guidance) hidden via the `hidden` attribute when closed.
 */
export function Disclosure({
  id,
  summary,
  children,
  isOpen,
  onToggle,
  headingLevel = 3,
  className,
}: DisclosureProps) {
  const buttonId = `${id}-trigger`
  const panelId = `${id}-panel`
  const HeadingTag = `h${headingLevel}` as const

  return (
    <div className={`${styles.item} ${className ?? ''}`}>
      <HeadingTag className={styles.heading}>
        <button
          type="button"
          id={buttonId}
          data-disclosure-trigger="true"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(!isOpen)}
          className={styles.trigger}
        >
          <span className={styles.icon} aria-hidden="true">
            {isOpen ? '−' : '+'}
          </span>
          {summary}
        </button>
      </HeadingTag>
      <div
        id={panelId}
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className={styles.panel}
      >
        {children}
      </div>
    </div>
  )
}
