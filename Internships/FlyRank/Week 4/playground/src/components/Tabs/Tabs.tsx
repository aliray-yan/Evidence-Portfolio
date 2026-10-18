import { useCallback, useId, useMemo, useState, type ReactNode } from 'react'
import {
  TabsContext,
  type TabsActivationMode,
  type TabsOrientation,
} from './TabsContext'

export interface TabsProps {
  children: ReactNode
  /** Id of the tab that should be selected by default (uncontrolled mode). */
  defaultSelectedId?: string
  /** Id of the currently selected tab (controlled mode). */
  selectedId?: string
  /** Called whenever the selected tab changes, in either mode. */
  onSelectedIdChange?: (id: string) => void
  /**
   * 'horizontal' (default) uses Left/Right arrows; 'vertical' uses Up/Down,
   * matching the WAI-ARIA APG Tabs pattern's orientation guidance.
   */
  orientation?: TabsOrientation
  /**
   * 'automatic' (default): moving focus with arrow keys immediately selects
   * the tab. 'manual': arrow keys only move focus; Enter/Space selects.
   * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#keyboardinteraction
   */
  activationMode?: TabsActivationMode
  className?: string
}

/**
 * Root component for the Tabs pattern. Provides shared state to <TabList>,
 * <Tab>, and <TabPanel> via context. Supports both controlled and
 * uncontrolled selection.
 *
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export function Tabs({
  children,
  defaultSelectedId,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  orientation = 'horizontal',
  activationMode = 'automatic',
  className,
}: TabsProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(
    defaultSelectedId,
  )
  const idBase = useId()

  const isControlled = controlledSelectedId !== undefined
  const selectedId = isControlled ? controlledSelectedId : internalSelectedId

  const setSelectedId = useCallback(
    (id: string) => {
      if (!isControlled) {
        setInternalSelectedId(id)
      }
      onSelectedIdChange?.(id)
    },
    [isControlled, onSelectedIdChange],
  )

  const contextValue = useMemo(
    () => ({
      selectedId: selectedId ?? '',
      setSelectedId,
      orientation,
      activationMode,
      idBase,
    }),
    [selectedId, setSelectedId, orientation, activationMode, idBase],
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}
