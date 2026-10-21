import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const FERTIG = {
  answer: 'Erledigt.',
  durationMs: 1200,
  isAborted: false,
  turnId: 't1',
  reason: 'answer',
} as const

const DATEI = 'C:/Users/T/.claude/mods-daten/fertig-krabbe.json'
const pfad = (p: string) => p.replace(/\\/g, '/')

// Steht für die Engine: merkt sich jeden Programmstart, statt ihn auszuführen; Dateien liegen im Speicher.
const engine = (on: On, starts: string[][], chat = { id: 'chat-1' }, dateien = new Map<string, string>()) => {
  on('env.get', ($, e) => ({ value: e.name === 'USERPROFILE' ? 'C:\\Users\\T' : undefined }))
  on('fs.exists', ($, e) => ({ value: dateien.has(pfad(e.path)) }))
  on('fs.read', ($, e) => {
    const text = dateien.get(pfad(e.path))
    if (text === undefined) throw new Error('fehlt')

    return { value: text }
  })
  on('fs.write', ($, e) => {
    dateien.set(pfad(e.path), e.text)

    return { value: undefined }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: chat.id }))
  on('session.cwd', () => ({ value: 'C:\\Projekte\\Beispiel' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: { answers: {} } }))
  on('classic.PermissionRequest', () => ({}))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('process.run', ($, e) => {
    starts.push([...e.argv])

    return {
      value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }
  })
}

test('winkt mit Ton, wenn die Hauptsitzung fertig ist', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)

  await $.turn.complete(FERTIG)

  expect(starts.length).toBe(1)
  expect(starts[0]?.[0]).toMatch(/\\bin\\krabbe\.exe$/)
  expect(starts[0]?.slice(1)).toEqual(['--titel', 'Beispiel'])
  expect(starts[0]).not.toContain('--frage')
})

test('bleibt still bei Subagenten und nach einem Abbruch', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)

  await $.turn.complete({ ...FERTIG, agentId: 'a1' })
  await $.turn.complete({ ...FERTIG, isAborted: true, reason: 'aborted' })

  expect(starts.length).toBe(0)
})

test('/krabbe schaltet den Modus um und der gilt beim nächsten Fertig', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)

  const leise = await $.command.run({ command: 'krabbe', args: 'leise' })
  expect(leise.text).toContain('ohne Ton')
  await $.turn.complete(FERTIG)
  expect(starts[0]).toContain('--leise')

  await $.command.run({ command: 'krabbe', args: 'aus' })
  await $.turn.complete(FERTIG)
  expect(starts.length).toBe(1)

  const unbekannt = await $.command.run({ command: 'krabbe', args: 'laut' })
  expect(unbekannt.text).toContain('kenne ich nicht')
})

// Den Freigabe-Dialog (classic.PermissionRequest) kann der Testbaukasten dieser Version nicht auslösen.
test('Rückfrage-Krabbe bei Auswahlfrage und Plan-Freigabe', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)
  mock.clock(on)

  await $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
  await $.tool.call({ tool: 'ExitPlanMode' } as never)

  expect(starts.length).toBe(2)
  for (const argv of starts) expect(argv).toContain('--frage')
})

test('endet die Antwort mit einer Frage, ist es eine Rückfrage', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)

  await $.turn.complete({ ...FERTIG, answer: 'Soll ich das so umsetzen?' })
  await $.turn.complete({ ...FERTIG, answer: 'Passt das so?**\n' })
  await $.turn.complete({ ...FERTIG, answer: 'Ist erledigt. Was meinst du? Ich habe es eingebaut.' })

  expect(starts[0]).toContain('--frage')
  expect(starts[1]).toContain('--frage')
  expect(starts[2]).not.toContain('--frage')
})

const MINUTEN = 60 * 1000

test('offene Frage am Ende: alle 5 Minuten wieder, bis du schreibst', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)
  const uhr = mock.clock(on)

  await $.turn.complete({ ...FERTIG, answer: 'Soll ich das so umsetzen?' })
  expect(starts.length).toBe(1)

  await uhr.advance(4 * MINUTEN)
  expect(starts.length).toBe(1)
  await uhr.advance(1 * MINUTEN)
  expect(starts.length).toBe(2)
  await uhr.advance(5 * MINUTEN)
  expect(starts.length).toBe(3)
  for (const argv of starts) expect(argv).toContain('--frage')

  await $.prompt.submit({ text: 'Ja, mach so.' })
  await uhr.advance(30 * MINUTEN)
  expect(starts.length).toBe(3)
})

test('offene Auswahlfrage: Erinnerung läuft, bis sie beantwortet ist', async ($, on) => {
  // Die Frage bleibt offen, bis der Test antwortet (vor engine(), damit dieser Hook antwortet).
  let antworten = () => {}
  on('tool.call', { tool: 'AskUserQuestion' }, () =>
    new Promise(fertig => {
      antworten = () => fertig({ result: { answers: {} } })
    }),
  )
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)
  const uhr = mock.clock(on)

  const frage = $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
  await uhr.settle()
  expect(starts.length).toBe(1)
  await uhr.advance(10 * MINUTEN)
  expect(starts.length).toBe(3)

  antworten()
  await frage
  await uhr.advance(30 * MINUTEN)
  expect(starts.length).toBe(3)
})

test('eine normale fertige Antwort beendet eine alte Erinnerung', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)
  const uhr = mock.clock(on)

  await $.turn.complete({ ...FERTIG, answer: 'Passt das?' })
  await $.turn.complete(FERTIG)
  await uhr.advance(30 * MINUTEN)

  expect(starts.length).toBe(2)
  expect(starts[1]).not.toContain('--frage')
})

test('/krabbe frage zeigt die Rückfrage-Krabbe', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)

  await $.command.run({ command: 'krabbe', args: 'frage' })

  expect(starts[0]).toContain('--frage')
})

test('/krabbe ohne Wort zeigt die Krabbe auch, wenn sie aus ist', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on, { modus: 'aus' })

  const antwort = await $.command.run({ command: 'krabbe' })

  expect(starts.length).toBe(1)
  expect(antwort.text).toContain('„aus“')
})

test('/krabbe hier-aus schaltet nur diesen Chat stumm, hier-an holt sie zurück', async ($, on) => {
  const starts: string[][] = []
  const chat = { id: 'chat-1' }
  engine(on, starts, chat)
  mock.store(on)
  const uhr = mock.clock(on)

  const aus = await $.command.run({ command: 'krabbe', args: 'hier-aus' })
  expect(aus.text).toContain('in diesem Chat aus')
  await $.turn.complete(FERTIG)
  await $.turn.complete({ ...FERTIG, answer: 'Passt das?' })
  await $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
  await uhr.advance(30 * MINUTEN)
  expect(starts.length).toBe(0)

  // Ein anderer Chat winkt weiter.
  chat.id = 'chat-2'
  await $.turn.complete(FERTIG)
  expect(starts.length).toBe(1)

  chat.id = 'chat-1'
  const status = await $.command.run({ command: 'krabbe' })
  expect(status.text).toContain('In diesem Chat ist sie aus')
  expect(starts.length).toBe(2)

  await $.command.run({ command: 'krabbe', args: 'hier an' })
  await $.turn.complete(FERTIG)
  expect(starts.length).toBe(3)
})

test('hier-aus stoppt eine laufende Erinnerung', async ($, on) => {
  const starts: string[][] = []
  engine(on, starts)
  mock.store(on)
  const uhr = mock.clock(on)

  await $.turn.complete({ ...FERTIG, answer: 'Soll ich?' })
  expect(starts.length).toBe(1)
  await $.command.run({ command: 'krabbe', args: 'hier-aus' })
  await uhr.advance(30 * MINUTEN)
  expect(starts.length).toBe(1)
})


test('Einstellungen liegen in der gemeinsamen Datei; alter Stand aus $.store wird übernommen', async ($, on) => {
  const starts: string[][] = []
  const dateien = new Map<string, string>()
  engine(on, starts, { id: 'chat-1' }, dateien)
  mock.store(on, { modus: 'leise', stumm: ['chat-9'] })

  await $.session.start({ cwd: 'C:/', surface: 'desktop', isInteractive: true })

  expect(JSON.parse(dateien.get(DATEI) ?? '{}')).toEqual({ modus: 'leise', stumm: ['chat-9'], an: [] })
})

test('überall aus, nur dieser Chat an: hier kommt die Krabbe mit Ton, anderswo nicht', async ($, on) => {
  const starts: string[][] = []
  const chat = { id: 'chat-1' }
  engine(on, starts, chat)
  mock.store(on)

  await $.command.run({ command: 'krabbe', args: 'aus' })
  const an = await $.command.run({ command: 'krabbe', args: 'hier-an' })
  expect(an.text).toContain('überall aus, in diesem Chat aber an')
  await $.turn.complete(FERTIG)
  expect(starts.length).toBe(1)
  expect(starts[0]).not.toContain('--leise')

  chat.id = 'chat-2'
  await $.turn.complete(FERTIG)
  expect(starts.length).toBe(1)

  // Ein neuer Modus für überall lässt die alte Ausnahme verfallen.
  chat.id = 'chat-1'
  await $.command.run({ command: 'krabbe', args: 'leise' })
  await $.command.run({ command: 'krabbe', args: 'aus' })
  await $.turn.complete(FERTIG)
  expect(starts.length).toBe(1)
})
