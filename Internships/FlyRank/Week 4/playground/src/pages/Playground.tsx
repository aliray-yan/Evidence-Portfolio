import { useRef, useState } from 'react'
import { Modal } from '../components/Modal'
import { Tabs, TabList, Tab, TabPanel } from '../components/Tabs'
import { Accordion } from '../components/Disclosure'
import styles from './Playground.module.css'

const faqItems = [
  {
    id: 'faq-focus',
    summary: 'Why does the modal trap focus?',
    content:
      'Trapping focus keeps keyboard and screen reader users inside the dialog while it is open, so Tab and Shift+Tab cannot silently move them into content that is visually hidden behind the overlay.',
  },
  {
    id: 'faq-escape',
    summary: 'What happens when I press Escape?',
    content:
      'Escape closes the currently open modal and returns focus to the button that opened it, so keyboard users never lose their place on the page.',
  },
  {
    id: 'faq-tabs',
    summary: 'How do the tabs handle arrow keys?',
    content:
      'Arrow keys move focus between tabs using a roving tabindex: only the active tab is in the page Tab order, and Left/Right (or Up/Down for vertical tabs) cycle focus between the rest, wrapping at each end.',
  },
]

export function Playground() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const modalTriggerRef = useRef<HTMLButtonElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Accessible Components Playground</h1>
        <p>
          Three components built from scratch against the WAI-ARIA Authoring
          Practices Guide, with no component library: a Modal Dialog, Tabs,
          and a Disclosure/Accordion.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="modal-heading">
        <div className={styles.sectionHeader}>
          <h2 id="modal-heading">Modal Dialog</h2>
          <a
            className={styles.specLink}
            href="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
            target="_blank"
            rel="noreferrer"
          >
            APG pattern ↗
          </a>
        </div>
        <p className={styles.sectionDescription}>
          Opens with focus moved to the first field, traps Tab/Shift+Tab
          inside, closes on Escape or overlay click, and returns focus to
          this button afterwards.
        </p>
        <button
          type="button"
          ref={modalTriggerRef}
          className={styles.primaryButton}
          onClick={() => setIsModalOpen(true)}
        >
          Open feedback form
        </button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Send feedback"
          initialFocusRef={firstFieldRef}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setIsModalOpen(false)
            }}
          >
            <div className={styles.modalField}>
              <label htmlFor="feedback-name">Name</label>
              <input id="feedback-name" ref={firstFieldRef} type="text" />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="feedback-message">Message</label>
              <textarea id="feedback-message" rows={4} />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Submit
              </button>
            </div>
          </form>
        </Modal>
      </section>

      <section className={styles.section} aria-labelledby="tabs-heading">
        <div className={styles.sectionHeader}>
          <h2 id="tabs-heading">Tabs</h2>
          <a
            className={styles.specLink}
            href="https://www.w3.org/WAI/ARIA/apg/patterns/tabs/"
            target="_blank"
            rel="noreferrer"
          >
            APG pattern ↗
          </a>
        </div>
        <p className={styles.sectionDescription}>
          Click a tab, or focus the tablist and use Left/Right, Home, and End.
          Focus follows selection (automatic activation).
        </p>

        <Tabs defaultSelectedId="profile" className={styles.tabsRoot}>
          <TabList aria-label="Account settings" className={styles.tabList}>
            <Tab id="profile" className={styles.tab}>
              Profile
            </Tab>
            <Tab id="security" className={styles.tab}>
              Security
            </Tab>
            <Tab id="notifications" className={styles.tab}>
              Notifications
            </Tab>
          </TabList>

          <TabPanel tabId="profile" className={styles.tabPanel}>
            <h3>Profile</h3>
            <p>Update your display name, photo, and public bio.</p>
          </TabPanel>
          <TabPanel tabId="security" className={styles.tabPanel}>
            <h3>Security</h3>
            <p>Manage your password, two-factor authentication, and active sessions.</p>
          </TabPanel>
          <TabPanel tabId="notifications" className={styles.tabPanel}>
            <h3>Notifications</h3>
            <p>Choose which emails and push notifications you want to receive.</p>
          </TabPanel>
        </Tabs>
      </section>

      <section className={styles.section} aria-labelledby="accordion-heading">
        <div className={styles.sectionHeader}>
          <h2 id="accordion-heading">Disclosure / Accordion</h2>
          <a
            className={styles.specLink}
            href="https://www.w3.org/WAI/ARIA/apg/patterns/accordion/"
            target="_blank"
            rel="noreferrer"
          >
            APG pattern ↗
          </a>
        </div>
        <p className={styles.sectionDescription}>
          Each header is a native button with aria-expanded and
          aria-controls. Focus the headers and use Up/Down, Home, and End to
          move between them.
        </p>

        <Accordion items={faqItems} className={styles.accordion} />
      </section>
    </main>
  )
}
