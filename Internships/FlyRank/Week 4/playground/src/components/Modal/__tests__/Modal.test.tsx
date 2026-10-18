import { useRef, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { expectNoAxeViolations } from '../../../test/axeHelpers'
import { Modal } from '../Modal'

/** Small harness so the Modal is exercised the way a real consumer would use it: a trigger button that owns open/close state. */
function ModalHarness({ closeOnOverlayClick }: { closeOnOverlayClick?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open dialog
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Example dialog"
        initialFocusRef={firstFieldRef}
        closeOnOverlayClick={closeOnOverlayClick}
      >
        <input ref={firstFieldRef} aria-label="First field" type="text" />
        <input aria-label="Second field" type="text" />
        <button type="button">Confirm</button>
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('is not rendered in the DOM when closed', () => {
    render(<ModalHarness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes the required dialog ARIA semantics when open', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy as string)).toHaveTextContent('Example dialog')
  })

  it('moves focus to the configured initial element on open', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    await waitFor(() => {
      expect(screen.getByLabelText('First field')).toHaveFocus()
    })
  })

  it('traps Tab focus within the dialog', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await waitFor(() => expect(screen.getByLabelText('First field')).toHaveFocus())

    // Tab through every focusable element in the dialog (close button, two
    // inputs, confirm button) and one extra step past the last one — focus
    // should wrap back inside the dialog, never escaping to <body>.
    await user.tab() // -> second field
    await user.tab() // -> confirm button
    await user.tab() // -> wraps to close button
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()

    await user.tab({ shift: true }) // shift+tab back to confirm button
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)

    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)
    await waitFor(() => expect(screen.getByLabelText('First field')).toHaveFocus())

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('makes background content inert while open', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <div>
        <p data-testid="background-text">Background content</p>
        <ModalHarness />
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await screen.findByRole('dialog')

    // `container` is itself the element appended as a direct child of
    // <body> by Testing Library, i.e. exactly the kind of "background
    // sibling" the Modal marks inert.
    expect(container.inert).toBe(true)
    expect(container.getAttribute('aria-hidden')).toBe('true')
  })

  it('has no detectable accessibility violations while open', async () => {
    const user = userEvent.setup()
    const { container } = render(<ModalHarness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await screen.findByRole('dialog')

    const results = await axe(container.ownerDocument.body)
    expectNoAxeViolations(results)
  })
})
