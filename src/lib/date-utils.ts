/**
 * Formats a date to display just the month and year
 * @param date Date to format
 * @returns Formatted date string like "Jan 2024"
 */
export function formatShortMonth(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${month} ${year}`;
} 