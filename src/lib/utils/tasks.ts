/**
 * Checks if a task's deadline day has passed (the very next day at 00:00:00).
 */
export function isTaskExpired(dueDateStr: string): boolean {
  if (!dueDateStr) return false;
  const parts = dueDateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const endOfDueDay = new Date(year, month, day, 23, 59, 59, 999);
    const now = new Date();
    return now.getTime() > endOfDueDay.getTime();
  }
  const d = new Date(dueDateStr);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}

/**
 * Formats an ISO or date string to YYYY-MM-DD for standard HTML input[type="date"].
 */
export function formatDateForInput(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
