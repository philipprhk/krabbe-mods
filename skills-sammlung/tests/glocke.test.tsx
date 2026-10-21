import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const DATEI = 'C:/Users/T/.claude/mods-daten/fertig-krabbe.json'
const pfad = (p: string) => p.replace(/\\/g, '/')

const LEISTE = {
  plugin: 'skills-sammlung',
  component: 'AbovePrompt',
  surface: 'desktop',
  props: { hasSurvey: false, isWorking: false, rows: 40 },
} as const

// Steht für die Engine; die Krabbe-Einstellungen liegen im Speicher statt auf der Platte.
const ALLE = ['krabbe', 'sitzung-beenden', 'skill-sammlung']

const engine = (on: On, dateien: Map<string, string>, chat = { id: 'chat-1' }, befehle: string[] = ALLE) => {
  on('command.list', () => ({ value: befehle.map(name => ({ name, source: 'plugin', description: '' })) }))
  on('env.get', ($, e) => ({ value: e.name === 'USERPROFILE' ? 'C:\\Users\\T' : undefined }))
  on('fs.read', ($, e) => {
    const text = dateien.get(pfad(e.path))
    if (text === undefined) throw new Error('fehlt')

    return { value: text }
  })
  on('fs.write', ($, e) => {
    dateien.set(pfad(e.path), e.text)

    return { value: undefined }
  })
  on('session.id', () => ({ value: chat.id }))
  on('command.run', () => ({ text: 'ok' }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>andere Leiste</Text>
  })
}

const datei = (modus: string, stumm: string[] = [], an: string[] = []) => JSON.stringify({ modus, stumm, an })

const glocke = async (ui: Awaited<ReturnType<Parameters<Parameters<typeof test>[1]>[0]['ui']['mount']>>) =>
  (await ui.find({ key: 'krabbe-hier' }))?.props.label

test('Glocke steht rechts neben „Sitzung beenden“, andere Leisten bleiben', async ($, on) => {
  const dateien = new Map<string, string>()
  engine(on, dateien)

  const ui = await $.ui.mount(LEISTE as never)
  const reihe = await ui.find({ key: 'sitzung-beenden' })
  expect(reihe).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /andere Leiste/ }))?.text).toBe('andere Leiste')
  const tasten = (await ui.findAll({ type: 'Button' })).map(b => b.key)
  expect(tasten.slice(-3)).toEqual(['skills-oeffnen', 'sitzung-beenden', 'krabbe-hier'])
  await ui.unmount()
})

test('die vier Symbole', async ($, on) => {
  const dateien = new Map<string, string>()
  engine(on, dateien)

  for (const [inhalt, symbol] of [
    [datei('an'), '🔔'],
    [datei('leise', ['chat-1']), '🔕'],
    [datei('aus'), '🔕 all'],
    [datei('aus', ['chat-1']), '🔕 all'],
    [datei('aus', [], ['chat-1']), '🔔 (🔕 all)'],
  ] as const) {
    dateien.set(DATEI, inhalt)
    const ui = await $.ui.mount(LEISTE as never)
    expect(await glocke(ui)).toBe(symbol)
    await ui.unmount()
  }
})

test('ohne Datei: Glocke an', async ($, on) => {
  engine(on, new Map())

  const ui = await $.ui.mount(LEISTE as never)
  expect(await glocke(ui)).toBe('🔔')
  await ui.unmount()
})

test('Klick schaltet nur diesen Chat um, auch als Ausnahme bei „überall aus“', async ($, on) => {
  const dateien = new Map<string, string>([[DATEI, datei('an', ['chat-7'])]])
  engine(on, dateien)

  const ui = await $.ui.mount(LEISTE as never)
  await ui.press({ key: 'krabbe-hier' })
  expect(await glocke(ui)).toBe('🔕')
  expect(JSON.parse(dateien.get(DATEI) ?? '{}').stumm).toEqual(['chat-7', 'chat-1'])
  await ui.press({ key: 'krabbe-hier' })
  expect(await glocke(ui)).toBe('🔔')

  dateien.set(DATEI, datei('aus'))
  await $.command.run({ command: 'krabbe', args: 'aus' })
  expect(await glocke(ui)).toBe('🔕 all')
  await ui.press({ key: 'krabbe-hier' })
  expect(await glocke(ui)).toBe('🔔 (🔕 all)')
  await ui.press({ key: 'krabbe-hier' })
  expect(await glocke(ui)).toBe('🔕 all')
  await ui.unmount()
})

test('neuer Chat nach /clear: Glocke folgt der neuen Sitzungs-ID', async ($, on) => {
  const chat = { id: 'chat-1' }
  const dateien = new Map<string, string>([[DATEI, datei('an', ['chat-1'])]])
  engine(on, dateien, chat)

  const ui = await $.ui.mount(LEISTE as never)
  expect(await glocke(ui)).toBe('🔕')
  chat.id = 'chat-neu'
  await $.prompt.submit({ text: 'weiter' })
  expect(await glocke(ui)).toBe('🔔')
  await ui.unmount()
})

test('Ausnahme bei „überall aus“ wieder weg: kein Stumm-Eintrag bleibt hängen', async ($, on) => {
  const dateien = new Map<string, string>([[DATEI, datei('aus', [], ['chat-1'])]])
  engine(on, dateien)

  const ui = await $.ui.mount(LEISTE as never)
  await ui.press({ key: 'krabbe-hier' })
  expect(await glocke(ui)).toBe('🔕 all')
  expect(JSON.parse(dateien.get(DATEI) ?? '{}')).toEqual({ modus: 'aus', stumm: [], an: [] })
  await ui.unmount()
})

test('ohne Krabbe-Mod keine Glocke, ohne Skill „sitzung-beenden“ kein Beenden-Knopf', async ($, on) => {
  engine(on, new Map(), { id: 'chat-1' }, ['skill-sammlung'])

  const ui = await $.ui.mount(LEISTE as never)
  expect(await ui.find({ key: 'krabbe-hier' })).toBeUndefined()
  expect(await ui.find({ key: 'sitzung-beenden' })).toBeUndefined()
  expect(await ui.find({ key: 'skills-oeffnen' })).toBeDefined()
  await ui.unmount()
})
