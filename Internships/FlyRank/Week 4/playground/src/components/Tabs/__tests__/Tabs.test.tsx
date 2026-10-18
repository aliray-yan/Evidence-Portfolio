import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { expectNoAxeViolations } from '../../../test/axeHelpers'
import { Tab, TabList, TabPanel, Tabs } from '../index'

function BasicTabs() {
  return (
    <Tabs defaultSelectedId="apples">
      <TabList aria-label="Fruit">
        <Tab id="apples">Apples</Tab>
        <Tab id="oranges">Oranges</Tab>
        <Tab id="pears">Pears</Tab>
      </TabList>
      <TabPanel tabId="apples">Apple content</TabPanel>
      <TabPanel tabId="oranges">Orange content</TabPanel>
      <TabPanel tabId="pears">Pear content</TabPanel>
    </Tabs>
  )
}

function ManualTabs() {
  return (
    <Tabs defaultSelectedId="apples" activationMode="manual">
      <TabList aria-label="Fruit">
        <Tab id="apples">Apples</Tab>
        <Tab id="oranges">Oranges</Tab>
      </TabList>
      <TabPanel tabId="apples">Apple content</TabPanel>
      <TabPanel tabId="oranges">Orange content</TabPanel>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renders tablist/tab/tabpanel roles with matching aria-controls/aria-labelledby', () => {
    render(<BasicTabs />)

    const tablist = screen.getByRole('tablist', { name: 'Fruit' })
    expect(tablist).toBeInTheDocument()

    const applesTab = screen.getByRole('tab', { name: 'Apples' })
    const panel = screen.getByRole('tabpanel')

    expect(applesTab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', applesTab.id)
  })

  it('only shows one tabpanel, matching the selected tab', () => {
    render(<BasicTabs />)
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Apple content')
  })

  it('uses a roving tabindex: only the selected tab is Tab-reachable', () => {
    render(<BasicTabs />)

    expect(screen.getByRole('tab', { name: 'Apples' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Oranges' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: 'Pears' })).toHaveAttribute('tabindex', '-1')
  })

  it('selects a tab on click', async () => {
    const user = userEvent.setup()
    render(<BasicTabs />)

    await user.click(screen.getByRole('tab', { name: 'Oranges' }))

    expect(screen.getByRole('tab', { name: 'Oranges' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Orange content')
  })

  it('ArrowRight/ArrowLeft move focus and selection, wrapping at the ends (automatic activation)', async () => {
    const user = userEvent.setup()
    render(<BasicTabs />)

    await user.click(screen.getByRole('tab', { name: 'Apples' }))

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Oranges' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Oranges' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Pears' })).toHaveFocus()

    // wraps past the last tab back to the first
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Apples' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Pears' })).toHaveFocus()
  })

  it('Home and End move focus to the first and last tab', async () => {
    const user = userEvent.setup()
    render(<BasicTabs />)

    await user.click(screen.getByRole('tab', { name: 'Oranges' }))

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Pears' })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Apples' })).toHaveFocus()
  })

  it('manual activation mode moves focus without selecting until Enter/Space', async () => {
    const user = userEvent.setup()
    render(<ManualTabs />)

    await user.click(screen.getByRole('tab', { name: 'Apples' }))
    await user.keyboard('{ArrowRight}')

    // Focus moved, but selection (and thus the visible panel) has not changed yet.
    expect(screen.getByRole('tab', { name: 'Oranges' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Apples' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Apple content')

    await user.keyboard('{Enter}')
    expect(screen.getByRole('tab', { name: 'Oranges' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Orange content')
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<BasicTabs />)
    const results = await axe(container)
    expectNoAxeViolations(results)
  })
})
