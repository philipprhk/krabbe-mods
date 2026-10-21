// Zählt Änderungen an den Krabbe-Einstellungen hoch, damit die eigene Glocke neu gezeichnet wird.
export type Stand = number

declare module 'claude-code' {
  interface PluginState {
    'fertig-krabbe': {
      stand: Stand
    }
  }
}
