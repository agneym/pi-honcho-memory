export const LIFECYCLE_WAIT_TIMEOUT_MS = 2_000;

const waitForAbort = (signal: AbortSignal): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });

export const waitForLifecycle = async (
  task: Promise<unknown>,
  signal?: AbortSignal,
): Promise<void> => {
  if (signal?.aborted) {
    return;
  }

  const timeout = AbortSignal.timeout(LIFECYCLE_WAIT_TIMEOUT_MS);
  const deadline = signal ? AbortSignal.any([signal, timeout]) : timeout;
  await Promise.race([task.catch(() => undefined), waitForAbort(deadline)]);
};
