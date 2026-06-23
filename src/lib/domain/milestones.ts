// Light-touch developmental notes shown "for interest" on the home screen.
// General guidance only (NHS / typical infant development), phrased as gentle
// "around now" remarks with ranges — every baby is different.
export interface Milestone {
  fromDay: number // age in days at which this note becomes the current one
  label: string
  note: string
}

// Sorted by fromDay ascending; the current note is the last one reached.
export const MILESTONES: Milestone[] = [
  {
    fromDay: 0,
    label: 'Week 1',
    note: 'She focuses best at about 20–30 cm — roughly your face during a cuddle or feed. Newborns notice bold light-and-dark patterns far more than colour.',
  },
  {
    fromDay: 7,
    label: 'Week 2',
    note: 'Beginning to study faces and briefly hold your gaze. Still very short-sighted, so keep things close.',
  },
  {
    fromDay: 14,
    label: 'Week 3',
    note: 'Awake stretches start to lengthen. She will begin to follow a slowly moving face or object with her eyes.',
  },
  {
    fromDay: 21,
    label: 'Week 4',
    note: 'Cooing sounds may start and she will turn toward familiar voices. Bold colours like red begin to register.',
  },
  {
    fromDay: 35,
    label: 'Around 6 weeks',
    note: 'First real social smiles often appear about now, and eye-tracking from side to side is getting smoother.',
  },
  {
    fromDay: 49,
    label: 'Around 7–8 weeks',
    note: 'More coos and gurgles, plus short bursts of head control during tummy time.',
  },
  {
    fromDay: 60,
    label: 'Around 2 months',
    note: 'She follows things with her eyes, may smile back at you, and her colour vision is developing quickly.',
  },
  {
    fromDay: 84,
    label: 'Around 3 months',
    note: 'Can focus across the room now (a couple of metres), pushes up on her arms, and bats at toys.',
  },
  {
    fromDay: 120,
    label: 'Around 4 months',
    note: 'Reaches out and grabs things, laughs out loud, and sees the full range of colours.',
  },
  {
    fromDay: 150,
    label: 'Around 5 months',
    note: 'May start rolling over and explores nearly everything by mouth.',
  },
  {
    fromDay: 180,
    label: 'Around 6 months',
    note: 'Often sitting with support and showing interest in first tastes of food.',
  },
  {
    fromDay: 270,
    label: 'Around 9 months',
    note: 'Babbling with more sounds, sitting unaided, and perhaps getting mobile by shuffling or crawling.',
  },
  {
    fromDay: 365,
    label: 'Around 12 months',
    note: 'Pulling to stand, and possibly first words and first steps.',
  },
]

export function milestoneFor(ageDays: number): { current: Milestone | null; next: Milestone | null } {
  let current: Milestone | null = null
  let next: Milestone | null = null
  for (const m of MILESTONES) {
    if (m.fromDay <= ageDays) current = m
    else {
      next = m
      break
    }
  }
  return { current, next }
}
