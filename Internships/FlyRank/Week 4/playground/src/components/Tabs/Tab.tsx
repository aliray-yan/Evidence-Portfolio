import type { FocusEvent, KeyboardEvent, ReactNode } from 'react'
import { useTabsContext } from './TabsContext'

export interface TabProps {
  /** Unique id for this tab within the Tabs instance. */
  id: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

/**
 * A single tab trigger. Implements:
 * - role="tab", aria-selected, aria-controls
 * - Roving tabindex (only the selected tab is in the Tab sequence)
 * - Automatic vs. manual activation, per Tabs' `activationMode`
 */
export function Tab({ id, children, disabled = false, className }: TabProps) {
  const { selectedId, setSelectedId, idBase, activationMode } = useTabsContext('Tab')
  const isSelected = selectedId === id
  const tabDomId = `${idBase}-tab-${id}`
  const panelDomId = `${idBase}-panel-${id}`

  const selectSelf = () => {
    if (!disabled) setSelectedId(id)
  }

  const handleFocus = (_event: FocusEvent<HTMLButtonElement>) => {
    if (activationMode === 'automatic') selectSelf()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (activationMode === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      selectSelf()
    }
  }

  return (
    <button
      type="button"
      role="tab"
      id={tabDomId}
      aria-selected={isSelected}
      aria-controls={panelDomId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={selectSelf}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </button>
  )
}
