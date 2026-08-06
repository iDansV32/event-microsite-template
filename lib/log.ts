export function swallowedError(context: string, err: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[swallowed:${context}]`, err);
  }
}
