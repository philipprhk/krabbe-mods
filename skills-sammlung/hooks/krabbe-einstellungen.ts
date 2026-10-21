import type { Hook } from 'claude-code'

// Gemeinsame Einstellungen der Fertig-Krabbe. Diese Datei liegt wortgleich in zwei Mods:
// fertig-krabbe/hooks/einstellungen.ts und skills-sammlung/hooks/krabbe-einstellungen.ts (Knopf in der Leiste).
// Beide lesen und schreiben dieselbe Datei, ~/.claude/mods-daten/fertig-krabbe.json. Änderungen in beide kopieren.

type Api = Parameters<Hook<'session.start'>>[0]

export const MODI = ['an', 'leise', 'nur-ton', 'aus'] as const
export type Modus = (typeof MODI)[number]

export const isModus = (text: unknown): text is Modus => (MODI as readonly unknown[]).includes(text)

// modus: gilt überall. stumm: Chats, in denen sie aus ist. an: Chats, in denen sie trotz „überall aus“ an ist.
// Chats nach Sitzungs-ID (Name der Transkriptdatei); nach /clear ist es ein neuer Chat mit neuer ID.
export type Einstellungen = { modus: Modus; stumm: string[]; an: string[] }

export const GRUND: Einstellungen = { modus: 'an', stumm: [], an: [] }

// Je Liste höchstens so viele Chats; die ältesten fallen heraus.
const MAX = 500

export const ids = (wert: unknown): string[] =>
  Array.isArray(wert) ? wert.filter((id): id is string => typeof id === 'string') : []

// Funktionen, die $ bekommen, sind Deklarationen (function …): nur denen folgt die Mod-Prüfung über einen Import.
export async function dateiPfad($: Api) {
  const heim = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''

  return `${heim.replace(/[\\/]+$/, '')}\\.claude\\mods-daten\\fertig-krabbe.json`
}

export const aufraeumen = (roh: unknown): Einstellungen => {
  const o = typeof roh === 'object' && roh !== null ? (roh as Record<string, unknown>) : {}

  return { modus: isModus(o.modus) ? o.modus : 'an', stumm: ids(o.stumm), an: ids(o.an) }
}

// Fehlt die Datei oder ist sie kaputt, gilt der Grundzustand.
export async function lesen($: Api): Promise<Einstellungen> {
  try {
    return aufraeumen(JSON.parse(await $.fs.read(await dateiPfad($))))
  } catch {
    return GRUND
  }
}

export async function schreiben($: Api, e: Einstellungen) {
  await $.fs.write(await dateiPfad($), `${JSON.stringify(e, null, 2)}\n`)
}

// Was in einem Chat gilt.
export type Hier = 'an' | 'stumm' | 'ueberall-aus' | 'nur-hier-an'

export const zustandHier = (e: Einstellungen, id: string): Hier =>
  e.modus === 'aus'
    ? e.an.includes(id)
      ? 'nur-hier-an'
      : 'ueberall-aus'
    : e.stumm.includes(id)
      ? 'stumm'
      : 'an'

// Aufschrift des Knopfs.
export const SYMBOL: Record<Hier, string> = {
  an: '🔔',
  stumm: '🔕',
  'ueberall-aus': '🔕 all',
  'nur-hier-an': '🔔 (🔕 all)',
}

export const istHierAn = (z: Hier) => z === 'an' || z === 'nur-hier-an'

// Der Modus, mit dem die Krabbe in diesem Chat kommt; „nur hier an“ heißt Ton und Krabbe.
export const modusHier = (e: Einstellungen, id: string): Modus => {
  const z = zustandHier(e, id)

  return z === 'nur-hier-an' ? 'an' : istHierAn(z) ? e.modus : 'aus'
}

// Schaltet nur diesen Chat an oder aus. Ist sie überall aus, wird der Chat zur Ausnahme bzw. verliert sie wieder
// (ohne Stumm-Eintrag, der sonst nach einem späteren „überall an“ hängen bliebe).
export const hierSetzen = (e: Einstellungen, id: string, an: boolean): Einstellungen => {
  const stumm = e.stumm.filter(x => x !== id)
  const ausnahmen = e.an.filter(x => x !== id)
  if (e.modus === 'aus') return { ...e, stumm, an: an ? [...ausnahmen, id].slice(-MAX) : ausnahmen }

  return { ...e, stumm: an ? stumm : [...stumm, id].slice(-MAX), an: ausnahmen }
}

export const umschalten = (e: Einstellungen, id: string) => hierSetzen(e, id, !istHierAn(zustandHier(e, id)))

// Ein neuer Modus für überall; alte Ausnahmen „nur hier an“ verfallen dabei.
export const modusSetzen = (e: Einstellungen, modus: Modus): Einstellungen => ({ ...e, modus, an: [] })

export const TOAST: Record<Hier, string> = {
  an: 'Krabbe ist in diesem Chat an.',
  stumm: 'Krabbe ist in diesem Chat aus.',
  'ueberall-aus': 'Krabbe ist überall aus, auch hier.',
  'nur-hier-an': 'Krabbe ist überall aus, nur in diesem Chat an.',
}
