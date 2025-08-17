export type IdValue = { id: string; value: number }

/**
 * Take last up to `limit` items from `values` and corresponding `ids`, keep original order.
 * Returns array of { id, value }.
 */
export function takeLastMapped(
  values: number[],
  ids: string[],
  limit = 50
): IdValue[] {
  if (!values || !ids || values.length === 0 || ids.length === 0) return []

  const slicedValues = values.slice(-limit)
  const slicedIds = ids.slice(-limit)

  // ensure lengths match; if mismatch, align by taking the shorter length
  const len = Math.min(slicedValues.length, slicedIds.length)
  const result: IdValue[] = []
  for (let i = 0; i < len; i++) {
    result.push({ id: slicedIds[i], value: slicedValues[i] })
  }
  return result
}
