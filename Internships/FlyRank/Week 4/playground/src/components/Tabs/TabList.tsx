import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTabsContext } from './TabsContext'

export interface TabListProps {
  children: ReactNode
  /** Accessible name for the tablist. Provide this or `aria-labelledby`. */
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

/**
 * Container for <Tab> elements. Implements the arrow-key roving-focus
 * navigation from the APG Tabs pattern: ArrowLeft/ArrowRight (or
 * ArrowUp/ArrowDown when vertical), Home, and End move focus between tabs.
 */
export function TabList({ children, className, ...ariaProps }: TabListProps) {
  const { orientation } = useTabsContext('TabList')
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const container = listRef.current
    if (!container) return

    const tabs = Array.from(
      container.querySelectorAll<HTMLElement>('[role="tab"]'),
    ).filter((tab) => !tab.hasAttribute('disabled'))
    if (tabs.length === 0) return

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement)
    if (currentIndex === -1) return

    const isHorizontal = orientation === 'horizontal'
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

    let nextIndex: number | null = null
    switch (event.key) {
      case nextKey:
        nextIndex = (currentIndex + 1) % tabs.length
        break
      case prevKey:
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    tabs[nextIndex]?.focus()
  }

  // The tablist container itself is intentionally not in the Tab sequence;
  // per the APG composite widget pattern, only the active <Tab> (roving
  // tabindex) is focusable, and this element just delegates arrow-key
  // navigation to its currently focused child.
  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={className}
      {...ariaProps}
    >
      {children}
    </div>
  )
}
