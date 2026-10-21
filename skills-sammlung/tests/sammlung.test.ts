import { expect, test } from 'claude-code/testing'
import type { CommandInfo } from 'claude-code'

import { gruppieren, kurzBeschreibung, skillsAus } from '../hooks/register'

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

test('ohne Befehlsliste gilt der Katalog', () => {
  expect(skillsAus([]).length).toBeGreaterThan(80)
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
