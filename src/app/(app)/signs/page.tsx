const SIGNS: { word: string; emoji: string; how: string }[] = [
  {
    word: 'Milk',
    emoji: '🥛',
    how: 'Hold one hand up in a loose fist, palm forward. Open and squeeze it repeatedly — like milking a cow or squeezing a sponge.',
  },
  {
    word: 'Sleep',
    emoji: '😴',
    how: 'Hold an open hand in front of your face, fingers spread. Draw it slowly down over your face, bringing the fingertips and thumb together as it reaches your chin — as if your eyes are closing.',
  },
  {
    word: 'Potty',
    emoji: '🚽',
    how: 'Make a fist with your thumb tucked between your index and middle fingers (the ASL letter “T”). Gently shake / twist it side to side.',
  },
  {
    word: 'Wash',
    emoji: '🛁',
    how: 'Make two fists (thumbs on top). Rub them up and down on your chest, like scrubbing in the bath. (This is the ASL sign for “bath”.)',
  },
]

export default function SignsPage() {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Baby signs</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Common ASL-based baby signs. Make the sign while you say the word and do the activity — repeated
        together, babies start to recognise and use them.
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
            href={`https://www.google.com/search?tbm=vid&q=${encodeURIComponent(`baby sign language ${s.word}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-teal-700 dark:text-teal-400 underline"
          >
            ▶ Watch a video
          </a>
        </div>
      ))}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Text descriptions for now — happy to add illustrations or short clips if you find ones you like.
      </p>
    </main>
  )
}
