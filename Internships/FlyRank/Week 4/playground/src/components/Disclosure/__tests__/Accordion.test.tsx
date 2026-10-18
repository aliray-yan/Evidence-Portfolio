import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { expectNoAxeViolations } from '../../../test/axeHelpers'
import { Accordion, Disclosure } from '../index'

function ControlledDisclosure() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Disclosure id="faq-1" summary="What is this?" isOpen={isOpen} onToggle={setIsOpen}>
      This is a disclosure panel.
    </Disclosure>
  )
}

const items = [
  { id: 'one', summary: 'Section one', content: 'Content one' },
  { id: 'two', summary: 'Section two', content: 'Content two' },
  { id: 'three', summary: 'Section three', content: 'Content three' },
]

describe('Disclosure', () => {
  it('starts collapsed with aria-expanded="false" and a hidden panel', () => {
    render(<ControlledDisclosure />)

    const trigger = screen.getByRole('button', { name: /what is this/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    const panelId = trigger.getAttribute('aria-controls')
    expect(document.getElementById(panelId as string)).not.toBeVisible()
  })

  it('expands on click, updating aria-expanded and revealing the panel', async () => {
    const user = userEvent.setup()
    render(<ControlledDisclosure />)

    const trigger = screen.getByRole('button', { name: /what is this/i })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panelId = trigger.getAttribute('aria-controls')
    expect(document.getElementById(panelId as string)).toBeVisible()
  })

  it('is keyboard-activatable with Space and Enter via native button semantics', async () => {
    const user = userEvent.setup()
    render(<ControlledDisclosure />)

    const trigger = screen.getByRole('button', { name: /what is this/i })
    trigger.focus()

    await user.keyboard(' ')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<ControlledDisclosure />)
    const results = await axe(container)
    expectNoAxeViolations(results)
  })
})

describe('Accordion', () => {
  it('renders one trigger per item, all collapsed by default', () => {
    render(<Accordion items={items} />)
    const triggers = screen.getAllByRole('button')
    expect(triggers).toHaveLength(3)
    triggers.forEach((trigger) => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
  })

  it('closes the previously open item when a new one opens (single-open mode)', async () => {
    const user = userEvent.setup()
    render(<Accordion items={items} />)

    await user.click(screen.getByRole('button', { name: 'Section one' }))
    expect(screen.getByRole('button', { name: 'Section one' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Section two' }))
    expect(screen.getByRole('button', { name: 'Section one' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Section two' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('allows multiple open items when allowMultipleOpen is set', async () => {
    const user = userEvent.setup()
    render(<Accordion items={items} allowMultipleOpen />)

    await user.click(screen.getByRole('button', { name: 'Section one' }))
    await user.click(screen.getByRole('button', { name: 'Section two' }))

    expect(screen.getByRole('button', { name: 'Section one' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Section two' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('ArrowDown/ArrowUp/Home/End move focus between headers', async () => {
    const user = userEvent.setup()
    render(<Accordion items={items} />)

    await user.click(screen.getByRole('button', { name: 'Section one' }))

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'Section two' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'Section three' })).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: 'Section two' })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'Section one' })).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'Section three' })).toHaveFocus()
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<Accordion items={items} />)
    const results = await axe(container)
    expectNoAxeViolations(results)
  })
})
