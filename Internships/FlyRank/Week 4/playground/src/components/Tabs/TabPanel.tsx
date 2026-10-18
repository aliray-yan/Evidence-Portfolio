import type { ReactNode } from 'react'
import { useTabsContext } from './TabsContext'

export interface TabPanelProps {
  /** Must match the `id` of the corresponding <Tab>. */
  tabId: string
  children: ReactNode
  className?: string
}

/**
 * Panel shown for the currently selected tab. Only the panel for the
 * selected tab is rendered; per the APG pattern this is a valid alternative
 * to rendering all panels with a `hidden` attribute.
 *
 * Note: unmounting inactive panels means any local state inside a panel
 * (uncontrolled form inputs, scroll position, etc.) is lost when its tab
 * becomes inactive and is reset when the tab is revisited.
 */
export function TabPanel({ tabId, children, className }: TabPanelProps) {
  const { selectedId, idBase } = useTabsContext('TabPanel')
  const isSelected = selectedId === tabId

  if (!isSelected) return null

  const panelDomId = `${idBase}-panel-${tabId}`
  const tabDomId = `${idBase}-tab-${tabId}`

  return (
    <div
      role="tabpanel"
      id={panelDomId}
      aria-labelledby={tabDomId}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  )
}
