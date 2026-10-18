import { createContext, useContext } from 'react'

export type TabsOrientation = 'horizontal' | 'vertical'
export type TabsActivationMode = 'automatic' | 'manual'

export interface TabsContextValue {
  selectedId: string
  setSelectedId: (id: string) => void
  orientation: TabsOrientation
  activationMode: TabsActivationMode
  idBase: string
}

export const TabsContext = createContext<TabsContextValue | null>(null)

export function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error(`<${componentName}> must be rendered inside a <Tabs> component.`)
  }
  return context
}
