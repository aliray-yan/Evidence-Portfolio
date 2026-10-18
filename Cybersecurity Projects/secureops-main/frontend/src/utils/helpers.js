import clsx from 'clsx';

export const cx = clsx;

export function priorityTone(score) {
  if (score >= 85) return 'text-red-600 dark:text-red-300';
  if (score >= 65) return 'text-orange-600 dark:text-orange-300';
  if (score >= 35) return 'text-yellow-700 dark:text-yellow-200';
  return 'text-green-600 dark:text-green-300';
}
