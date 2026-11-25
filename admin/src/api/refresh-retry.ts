export async function refreshThenRetry<T>(
  refresh: () => Promise<void>,
  retry: () => Promise<T>,
  onRefreshFailure: () => void,
): Promise<T> {
  try {
    await refresh()
  } catch (error) {
    onRefreshFailure()
    throw error
  }
  return retry()
}
