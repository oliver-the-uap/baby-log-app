const SIGNS: { word: string; emoji: string; slug: string; how?: string }[] = [
  {
    word: 'Milk',
    emoji: '🥛',
    slug: 'milk',
    how: 'Make a fist and squeeze it open-and-shut a couple of times — like milking a cow.',
  },
  {
    word: 'Sleep',
    emoji: '😴',
    slug: 'sleep',
    how: 'Open hand in front of your face, fingers spread; draw it down over your face, bringing the fingertips and thumb together at your chin (as if your eyes are closing).',
  },
  {
    word: 'Potty',
    emoji: '🚽',
    slug: 'toilet',
    // BSL toilet/wee signs vary regionally — left to the video so it's accurate.
  },
  {
    word: 'Wash',
    emoji: '🛁',
    slug: 'bath',
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
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {s.how ?? 'BSL can vary a little by region — tap below to watch the sign.'}
          </p>
          <a
            href={`https://www.signbsl.com/sign/${s.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-teal-700 dark:text-teal-400 underline"
          >
            ▶ Watch the BSL sign
          </a>
        </div>
      ))}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        The video is the definitive reference (BSL has regional variation). Happy to add illustrations
        or embed clips if you find ones you like.
      </p>
    </main>
  )
}
