// Centered moving average for sparse daily series.
// `null` inputs are treated as missing: skipped in the average and kept null
// in the output (so a trend line breaks rather than dipping to zero).
export function movingAverage(values: (number | null)[], window = 3): (number | null)[] {
  const half = Math.floor(window / 2)
  return values.map((v, i) => {
    if (v == null) return null
    let sum = 0
    let n = 0
    for (let k = i - half; k <= i + half; k++) {
      const x = values[k]
      if (k >= 0 && k < values.length && x != null) {
        sum += x
        n++
      }
    }
    return n ? Math.round((sum / n) * 100) / 100 : null
  })
}
