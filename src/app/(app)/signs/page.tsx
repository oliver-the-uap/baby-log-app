const SIGNS: { word: string; emoji: string; slug: string; how: string }[] = [
  {
    word: 'Milk',
    emoji: '🥛',
    slug: 'milk',
    how: 'Hold both hands in loose fists in front of you and move them up and down alternately, close together — like working a pump.',
  },
  {
    word: 'Sleep',
    emoji: '😴',
    slug: 'sleep',
    how: 'Hold both hands up in front of your eyes, then bring each index finger down onto its thumb — as if your eyes are closing.',
  },
  {
    word: 'Potty',
    emoji: '🚽',
    slug: 'toilet',
    how: 'Hold one hand flat, palm up. With the other hand, tap the inside edge of that palm twice with an extended index finger. (BSL “toilet”.)',
  },
  {
    word: 'Wash',
    emoji: '🛁',
    slug: 'bath',
    how: 'Make two loose fists — one up by your shoulder, one down by your waist — and move them diagonally up and down, as if drying with a towel. (BSL “bath”.)',
  },
]

export default function SignsPage() {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Baby signs (BSL)</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Common British Sign Language baby signs. Make the sign while you say the word and do the
        activity — repeated together, babies start to recognise and use them.
      </p>

      {SIGNS.map((s) => (
        <div key={s.word} className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl" aria-hidden>
              {s.emoji}
            </span>
            <h2 className="text-lg font-medium">{s.word}</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{s.how}</p>
          <a
            href={`https://www.british-sign.co.uk/british-sign-language/how-to-sign/${s.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-teal-700 dark:text-teal-400 underline"
          >
            ▶ Watch the BSL sign
          </a>
        </div>
      ))}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Descriptions from the British Sign Language Dictionary (british-sign.co.uk).
      </p>
    </main>
  )
}
