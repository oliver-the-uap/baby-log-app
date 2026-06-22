'use client'
import { useEffect, useState } from 'react'
import { listNotes, addNote, setNoteDone, deleteNote, type Note } from '@/lib/data/notes'
import { notifyError } from '@/lib/notify'

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')

  function refresh() {
    listNotes().then(setNotes).catch(notifyError)
  }
  useEffect(() => {
    refresh()
  }, [])

  async function add() {
    const t = text.trim()
    if (!t) return
    try {
      await addNote(t)
      setText('')
      refresh()
    } catch (e) {
      notifyError(e)
    }
  }
  async function toggle(n: Note) {
    try {
      await setNoteDone(n.id, !n.done)
      refresh()
    } catch (e) {
      notifyError(e)
    }
  }
  async function remove(id: string) {
    try {
      await deleteNote(id)
      refresh()
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Questions &amp; notes</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Jot down things to ask your midwife, health visitor or GP. Tick them off once you have an answer.
      </p>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg p-3"
          placeholder="Add a question or note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button
          onClick={add}
          className="px-4 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        >
          Add
        </button>
      </div>

      <ul>
        {notes.map((n) => (
          <li key={n.id} className="flex items-start gap-3 border-b border-gray-200 dark:border-neutral-800 py-3">
            <input
              type="checkbox"
              checked={n.done}
              onChange={() => toggle(n)}
              className="mt-1 shrink-0"
              aria-label={n.done ? 'Mark unanswered' : 'Mark answered'}
            />
            <span
              className={`flex-1 text-sm ${
                n.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {n.text}
            </span>
            <button onClick={() => remove(n.id)} className="text-gray-400 text-sm shrink-0" aria-label="Delete">
              ✕
            </button>
          </li>
        ))}
        {notes.length === 0 && <li className="text-sm text-gray-500 dark:text-gray-400 py-2">No questions yet.</li>}
      </ul>
    </main>
  )
}
