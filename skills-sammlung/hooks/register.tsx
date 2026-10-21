import type { CommandInfo, Hook, Register } from 'claude-code'

import type { Ansicht, Skill } from '../types'
import { BEREICHE, HERAUSGEBER, KATALOG, REIHENFOLGE_BEREICHE, REIHENFOLGE_HERAUSGEBER } from './katalog'
import { lesen, schreiben, SYMBOL, TOAST, umschalten, zustandHier } from './krabbe-einstellungen'

type Api = Parameters<Hook<'session.start'>>[0]

const PANE = 'skills-sammlung'

const ANSICHT = { plugin: 'skills-sammlung', key: 'ansicht' } as const
const OFFEN = { plugin: 'skills-sammlung', key: 'offen' } as const
const SUCHE = { plugin: 'skills-sammlung', key: 'suche' } as const
const LISTE = { plugin: 'skills-sammlung', key: 'liste' } as const
const KRABBE_STAND = { plugin: 'skills-sammlung', key: 'krabbeStand' } as const

// Die Krabbe-Einstellungen haben sich geändert (Knopf, /krabbe, neuer Chat): Glocke neu zeichnen.
const krabbeNeuZeichnen = async ($: Api) => {
  try {
    const { value = 0 } = await $.state.get(KRABBE_STAND)
    await $.state.set(KRABBE_STAND, value + 1)
  } catch (fehler) {
    $.ui.log(`skills-sammlung: Glocke nicht neu gezeichnet: ${String(fehler)}`, { to: 'debug' })
  }
}

// Glocken-Knopf: schaltet die Fertig-Krabbe nur in diesem Chat an oder aus (gemeinsame Datei mit dem Mod fertig-krabbe).
const krabbeUmschalten = async ($: Api) => {
  try {
    const id = await $.session.id()
    const neu = umschalten(await lesen($), id)
    await schreiben($, neu)
    await krabbeNeuZeichnen($)
    $.ui.toast(TOAST[zustandHier(neu, id)])
  } catch (fehler) {
    $.ui.toast(`Krabbe ließ sich nicht umschalten: ${String(fehler)}`)
  }
}

// Befehle der eigenen Mods sind keine Skills.
const KEINE_SKILLS = new Set(['skill-sammlung', 'skills', 'krabbe', 'leiste'])

export const grundname = (name: string) => name.slice(name.lastIndexOf(':') + 1)

// Erster Satz, höchstens 140 Zeichen.
export const kurzBeschreibung = (text: string) => {
  const satz = text.trim().split(/(?<=[.!?])\s/)[0] ?? ''

  return satz.length > 140 ? `${satz.slice(0, 137).trimEnd()}…` : satz
}

const ausKatalog = (): Skill[] =>
  [...KATALOG].map(([kurz, e]) => ({ name: kurz, kurz, beschreibung: '', ...e }))

// Macht aus der Befehlsliste der Sitzung die Skill-Liste. Ohne Liste gilt der Katalog.
export const skillsAus = (befehle: readonly CommandInfo[]): Skill[] => {
  const gesehen = new Set<string>()
  const ergebnis: Skill[] = []

  for (const b of befehle) {
    const kurz = grundname(b.name)
    const eintrag = KATALOG.get(kurz)
    const istSkill = eintrag !== undefined || b.source === 'plugin' || b.source === 'user'
    if (!istSkill || KEINE_SKILLS.has(b.name) || gesehen.has(kurz)) continue
    gesehen.add(kurz)

    const vorsatz = b.name.includes(':') ? b.name.slice(0, b.name.indexOf(':')) : undefined
    ergebnis.push({
      name: b.name,
      kurz,
      beschreibung: kurzBeschreibung(b.description),
      herausgeber:
        eintrag?.herausgeber ??
        (b.source === 'user' ? HERAUSGEBER.eigene : (b.plugin ?? vorsatz ?? HERAUSGEBER.unbekannt)),
      bereich: eintrag?.bereich ?? BEREICHE.sonstiges,
    })
  }

  return ergebnis.length > 0 ? ergebnis : ausKatalog()
}

const laden = async ($: Api) => {
  let befehle: CommandInfo[] = []
  try {
    befehle = await $.command.list()
  } catch (fehler) {
    $.ui.log(`skills-sammlung: Befehlsliste nicht lesbar: ${String(fehler)}`, { to: 'debug' })
  }
  const skills = skillsAus(befehle)
  await $.state.set(LISTE, skills)
}

const oeffnen = async ($: Api) => {
  await laden($)
  await $.ui.open({ id: PANE, title: 'Skills', focus: true, closeOnEscape: true })
}

const einsetzen = async ($: Api, skill: Skill) => {
  const { isFilled } = await $.prompt.fill({ text: `/${skill.name} ` })
  if (isFilled) {
    await $.ui.close({ id: PANE })
  } else {
    $.ui.toast(`/${skill.name} ließ sich nicht ins Eingabefeld setzen`)
  }
}

// Setzt den Befehl nur ins Eingabefeld: Enter ist die Bestätigung, ein Fehlklick beendet nichts.
const beenden = async ($: Api) => {
  const { isFilled } = await $.prompt.fill({ text: '/sitzung-beenden ' })
  if (!isFilled) $.ui.toast('/sitzung-beenden ließ sich nicht ins Eingabefeld setzen')
}

// Gruppiert nach der gewählten Ansicht, in fester Reihenfolge; unbekannte Gruppen ans Ende.
export const gruppieren = (skills: readonly Skill[], wie: Ansicht, filter: string) => {
  const f = filter.trim().toLowerCase()
  const passend =
    f === ''
      ? skills
      : skills.filter(s =>
          [s.name, s.beschreibung, s.herausgeber, s.bereich].some(t => t.toLowerCase().includes(f)),
        )
  const reihenfolge = wie === 'herausgeber' ? REIHENFOLGE_HERAUSGEBER : REIHENFOLGE_BEREICHE
  const gruppen = new Map<string, Skill[]>()
  for (const s of passend) {
    const g = wie === 'herausgeber' ? s.herausgeber : s.bereich
    gruppen.set(g, [...(gruppen.get(g) ?? []), s])
  }
  const rang = (g: string) => {
    const i = reihenfolge.indexOf(g)

    return i === -1 ? reihenfolge.length : i
  }

  return [...gruppen]
    .sort(([a], [b]) => rang(a) - rang(b) || a.localeCompare(b, 'de'))
    .map(([name, eintraege]) => ({
      name,
      skills: [...eintraege].sort((a, b) => a.kurz.localeCompare(b.kurz, 'de')),
    }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'skill-sammlung',
        description: 'Fenster mit allen installierten Skills, nach Herausgeber oder Bereich',
      })
    } catch (fehler) {
      $.ui.log(`skills-sammlung: /skill-sammlung nicht registriert: ${String(fehler)}`, { to: 'debug' })
    }

    return next(e)
  })

  // /krabbe … des Mods fertig-krabbe und ein neuer Chat (/clear) können die Glocke ändern.
  on('command.run', { command: 'krabbe' }, async ($, e, next) => {
    const ergebnis = await next(e)
    await krabbeNeuZeichnen($)

    return ergebnis
  })

  on('prompt.submit', async ($, e, next) => {
    await krabbeNeuZeichnen($)

    return next(e)
  })

  on('command.run', { command: 'skill-sammlung' }, async $ => {
    await oeffnen($)

    return { text: 'Skills-Fenster geöffnet.' }
  })

  // Schmale Leiste über dem Eingabefeld mit den Knöpfen. `next(e)` muss mitgezeichnet werden,
  // sonst verschwinden die Leisten anderer Mods (z. B. die Vorschläge von next-steps).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const darunter = await next(e)
    if (e.props.hasSurvey) return darunter
    const { Box, Button } = $.ui.resolve(e)
    // Liest den Zähler, damit eine Änderung neu zeichnet; der Zustand selbst kommt aus der Datei.
    await $.state.get(KRABBE_STAND)
    const glocke = SYMBOL[zustandHier(await lesen($), await $.session.id())]

    return (
      <Box flexDirection="column">
        {darunter}
        <Box flexDirection="row" gap={1}>
          <Button key="skills-oeffnen" label="🧩 Skills" variant="secondary" onPress={() => oeffnen($)} />
          <Button key="sitzung-beenden" label="🏁 Sitzung beenden" variant="secondary" onPress={() => beenden($)} />
          <Button key="krabbe-hier" label={glocke} variant="secondary" onPress={() => krabbeUmschalten($)} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const wie: Ansicht = (await $.state.get(ANSICHT)).value ?? 'bereich'
    const filter = (await $.state.get(SUCHE)).value ?? ''
    const auf = new Set((await $.state.get(OFFEN)).value ?? [])
    const skills = (await $.state.get(LISTE)).value ?? []
    const gruppen = gruppieren(skills, wie, filter)
    const alleAuf = filter.trim() !== ''
    const umschalten = async (g: string) => {
      const l = (await $.state.get(OFFEN)).value ?? []
      await $.state.set(OFFEN, l.includes(g) ? l.filter(x => x !== g) : [...l, g])
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          <Button
            key="ansicht-bereich"
            label="Nach Bereich"
            variant={wie === 'bereich' ? 'primary' : 'secondary'}
            onPress={() => $.state.set(ANSICHT, 'bereich')}
          />
          <Button
            key="ansicht-herausgeber"
            label="Nach Herausgeber"
            variant={wie === 'herausgeber' ? 'primary' : 'secondary'}
            onPress={() => $.state.set(ANSICHT, 'herausgeber')}
          />
          <Text dimColor>{skills.length} Skills</Text>
        </Box>
        {Input !== undefined && (
          <Input
            key="suche"
            placeholder="Suchen: Name, Beschreibung, Herausgeber …"
            value={filter}
            onInput={wert => $.state.set(SUCHE, wert)}
            onSubmit={wert => $.state.set(SUCHE, wert)}
          />
        )}
        {gruppen.length === 0 && <Text dimColor>Nichts gefunden.</Text>}
        {gruppen.map(g => {
          const istAuf = alleAuf || auf.has(g.name)

          return (
            <Box key={`g-${g.name}`} flexDirection="column">
              <Button
                key={`gruppe:${g.name}`}
                plain
                label={`${istAuf ? '▾' : '▸'} ${g.name} (${g.skills.length})`}
                onPress={() => umschalten(g.name)}
              />
              {istAuf &&
                g.skills.map(s => (
                  <Box key={`z-${s.name}`} flexDirection="row" gap={1} paddingLeft={2}>
                    <Button key={`skill:${s.name}`} label={`/${s.kurz}`} onPress={() => einsetzen($, s)} />
                    <Text dimColor wrap="truncate-end">
                      {s.beschreibung || (wie === 'bereich' ? s.herausgeber : s.bereich)}
                    </Text>
                  </Box>
                ))}
            </Box>
          )
        })}
        <Text dimColor>Klick auf einen Skill setzt ihn ins Eingabefeld. Esc schließt.</Text>
      </Box>
    )
  })
}
