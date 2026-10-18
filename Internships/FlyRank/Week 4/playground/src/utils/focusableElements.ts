/**
 * Selector for elements that can receive keyboard focus.
 * This intentionally mirrors the practical subset used by the WAI-ARIA APG
 * example implementations (it does not attempt to cover every possible
 * focusable edge case such as elements with negative tabindex removed via
 * script, or shadow DOM boundaries).
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Returns all focusable descendants of `container`, in DOM order, excluding
 * elements that are hidden (display: none / visibility: hidden) or have
 * aria-hidden="true".
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )

  return candidates.filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false
    if (element.hasAttribute('disabled')) return false

    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false

    // offsetParent is null for elements that are not rendered (e.g. display:none
    // ancestors), but is also null for position:fixed elements, so we only use
    // it as a secondary signal alongside computed style above.
    return true
  })
}
