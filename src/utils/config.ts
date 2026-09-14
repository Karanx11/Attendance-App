/** App-level personal constants. */

/** The user's joining date ('YYYY-MM-DD'). Rendered with a special badge. */
export const JOINING_DATE = '2026-07-27'
export const JOINING_LABEL = 'Joining Date'

export function isJoiningDate(dateKey: string): boolean {
  return dateKey === JOINING_DATE
}
