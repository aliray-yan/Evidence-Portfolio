import type { AxeResults } from 'axe-core'

/**
 * Asserts that an axe-core run produced no accessibility violations, with a
 * readable failure message listing each violation's rule id, help text, and
 * how many nodes it affected.
 */
export function expectNoAxeViolations(results: AxeResults): void {
  if (results.violations.length === 0) return

  const summary = results.violations
    .map((violation) => `- ${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`)
    .join('\n')

  throw new Error(
    `Expected no accessibility violations, but found ${results.violations.length}:\n${summary}`,
  )
}
