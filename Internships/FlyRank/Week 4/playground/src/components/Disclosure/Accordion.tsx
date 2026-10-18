import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Disclosure, type HeadingLevel } from './Disclosure'

export interface AccordionItem {
  id: string
  summary: ReactNode
  content: ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  /** If true, multiple sections may be open at once. Defaults to false (single-open accordion). */
  allowMultipleOpen?: boolean
  /** Ids that should start open. */
  defaultOpenIds?: string[]
  headingLevel?: HeadingLevel
  className?: string
}

/**
 * Groups several <Disclosure> items into an accordion, per the WAI-ARIA APG
 * Accordion pattern (a set of disclosures, optionally restricted to one open
 * section at a time): https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 *
 * Adds the pattern's optional keyboard enhancement: Down/Up Arrow, Home, and
 * End move focus between accordion headers.
 */
export function Accordion({
  items,
  allowMultipleOpen = false,
  defaultOpenIds = [],
  headingLevel = 3,
  className,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(defaultOpenIds))
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = (id: string, next: boolean) => {
    setOpenIds((prev) => {
      const updated = allowMultipleOpen ? new Set(prev) : new Set<string>()
      if (next) {
        updated.add(id)
      } else {
        updated.delete(id)
      }
      return updated
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return

    const headers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-disclosure-trigger="true"]'),
    )
    if (headers.length === 0) return

    const currentIndex = headers.findIndex((header) => header === document.activeElement)
    if (currentIndex === -1) return

    let nextIndex: number | null = null
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % headers.length
        break
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + headers.length) % headers.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = headers.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    headers[nextIndex]?.focus()
  }

  return (
    // This wrapper has no role of its own; it only delegates arrow-key
    // navigation (Up/Down/Home/End) to whichever disclosure trigger button
    // is currently focused, matching the APG Accordion pattern's optional
    // keyboard support.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={containerRef} className={className} onKeyDown={handleKeyDown}>
      {items.map((item) => (
        <Disclosure
          key={item.id}
          id={item.id}
          summary={item.summary}
          headingLevel={headingLevel}
          isOpen={openIds.has(item.id)}
          onToggle={(next) => handleToggle(item.id, next)}
        >
          {item.content}
        </Disclosure>
      ))}
    </div>
  )
}
