export type Ansicht = 'herausgeber' | 'bereich'

export type Skill = {
  // Wie man ihn aufruft, ohne Schrägstrich (z. B. „anthropic-skills:brand“).
  name: string
  // Grundname ohne Plugin-Vorsatz (z. B. „brand“).
  kurz: string
  beschreibung: string
  herausgeber: string
  bereich: string
}

declare module 'claude-code' {
  interface PluginState {
    'skills-sammlung': {
      ansicht: Ansicht
      offen: string[]
      suche: string
      liste: Skill[]
      // Zählt Änderungen an den Krabbe-Einstellungen hoch, damit der Glocken-Knopf neu gezeichnet wird.
      krabbeStand: number
      // Gruppen, die laut eigener Datei des Nutzers zuerst kommen.
      vorne: string[]
    }
  }
}
