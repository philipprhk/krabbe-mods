import { expect, test } from 'claude-code/testing'
import type { CommandInfo } from 'claude-code'

import { eigenerKatalogAus, gruppieren, kurzBeschreibung, skillsAus } from '../hooks/register'

const befehl = (name: string, source: CommandInfo['source'], description = 'Tut etwas. Und mehr.'): CommandInfo => ({
  name,
  source,
  description,
})

test('ordnet Skills aus der Befehlsliste nach Katalog zu und lässt eingebaute Befehle weg', () => {
  const skills = skillsAus([
    befehl('anthropic-skills:brand', 'plugin'),
    befehl('mein-skill', 'user'),
    befehl('animate', 'user'),
    befehl('clear', 'builtin'),
    befehl('skills', 'plugin'),
    befehl('dataviz', 'builtin'),
    befehl('unbekannt:neuer-skill', 'plugin'),
  ])
  const nach = Object.fromEntries(skills.map(s => [s.kurz, s]))

  expect(Object.keys(nach).sort()).toEqual(['animate', 'brand', 'dataviz', 'mein-skill', 'neuer-skill'])
  expect(nach.brand?.name).toBe('anthropic-skills:brand')
  expect(nach.brand?.herausgeber).toBe('ClaudeKit')
  expect(nach.animate?.herausgeber).toBe('Emil Kowalski')
  expect(nach['mein-skill']?.herausgeber).toBe('Eigene')
  expect(nach['neuer-skill']?.herausgeber).toBe('unbekannt')
  expect(nach['neuer-skill']?.bereich).toBe('Sonstiges')
  expect(nach.brand?.beschreibung).toBe('Tut etwas.')
})

test('zeigt nur, was installiert ist: ohne Befehle keine Skills', () => {
  expect(skillsAus([])).toEqual([])
})

test('unbekannte Skills: Bereich nach Stichwörtern, Herausgeber nach Herkunft', () => {
  const skills = skillsAus([
    befehl('acme:vertrags-check', 'plugin', 'Prüft einen Vertrag auf Risiken.'),
    befehl('mein-video-tool', 'user', 'Fasst ein YouTube-Video zusammen.'),
    befehl('build-helper', 'user', 'Hilft beim Bauen.'),
    befehl('notizen', 'user', 'Holt die latest keyword list.'),
    befehl('fertig-krabbe:krabbe', 'plugin', 'Krabbe.'),
  ])
  const nach = Object.fromEntries(skills.map(s => [s.kurz, s]))

  expect(nach['vertrags-check']?.bereich).toBe('Recht & Verträge')
  expect(nach['vertrags-check']?.herausgeber).toBe('acme')
  expect(nach['mein-video-tool']?.bereich).toBe('Recherche & Video')
  expect(nach['mein-video-tool']?.herausgeber).toBe('Eigene')
  // „ui“ steckt in „build“, zählt aber nur als ganzes Wort.
  expect(nach['build-helper']?.bereich).toBe('Sonstiges')
  // Stichwörter zählen am Wortanfang: „latest“ ist kein „test“, „keyword“ kein „word“.
  expect(nach.notizen?.bereich).toBe('Sonstiges')
  // Befehle der eigenen Mods sind keine Skills, auch mit Plugin-Vorsatz.
  expect(nach.krabbe).toBeUndefined()
})

test('eigene Datei des Nutzers geht vor und bestimmt, welche Gruppen zuerst kommen', () => {
  const eigene = eigenerKatalogAus({
    skills: { 'shop-tool': { herausgeber: 'Ich', bereich: 'Mein Shop' }, animate: { bereich: 'Lieblinge' } },
    reihenfolge: ['Mein Shop'],
  })
  const skills = skillsAus(
    [befehl('shop-tool', 'user'), befehl('animate', 'user'), befehl('anthropic-skills:pdf', 'plugin')],
    eigene,
  )
  const nach = Object.fromEntries(skills.map(s => [s.kurz, s]))

  expect(nach['shop-tool']).toMatchObject({ herausgeber: 'Ich', bereich: 'Mein Shop' })
  expect(nach.animate).toMatchObject({ herausgeber: 'Emil Kowalski', bereich: 'Lieblinge' })
  expect(gruppieren(skills, 'bereich', '', eigene.reihenfolge)[0]?.name).toBe('Mein Shop')
  expect(eigenerKatalogAus('kaputt')).toEqual({ skills: {}, reihenfolge: [] })
})

test('gruppiert in fester Reihenfolge und filtert über die Suche', () => {
  const skills = skillsAus([
    befehl('ui-styling', 'plugin'),
    befehl('animate', 'user'),
    befehl('anthropic-skills:pdf', 'plugin', 'PDF bearbeiten.'),
  ])

  expect(gruppieren(skills, 'bereich', '').map(g => g.name)).toEqual([
    'Design & UI',
    'Animation & Motion',
    'Texte & Dokumente',
  ])
  expect(gruppieren(skills, 'herausgeber', '').map(g => g.name)).toEqual([
    'Emil Kowalski',
    'ClaudeKit',
    'Anthropic',
  ])
  expect(gruppieren(skills, 'bereich', 'pdf').flatMap(g => g.skills.map(s => s.kurz))).toEqual(['pdf'])
})

test('kürzt lange Beschreibungen auf den ersten Satz', () => {
  expect(kurzBeschreibung('Kurz. Lang.')).toBe('Kurz.')
  expect(kurzBeschreibung('x'.repeat(200)).length).toBe(138)
})
