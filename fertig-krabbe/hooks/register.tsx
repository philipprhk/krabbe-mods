import type { Hook, Register, Timer } from 'claude-code'

import {
  aufraeumen,
  dateiPfad,
  type Einstellungen,
  hierSetzen,
  isModus,
  lesen,
  type Modus,
  modusHier,
  modusSetzen,
  schreiben,
  SYMBOL,
  TOAST,
  umschalten,
  zustandHier,
} from './einstellungen'

type Api = Parameters<Hook<'session.start'>>[0]

// Solange eine Rückfrage offen ist, kommt die Krabbe in diesem Abstand wieder.
const ERINNERN_MS = 5 * 60 * 1000

const BESCHREIBUNG: Record<Modus, string> = {
  an: 'Ton und Krabbe',
  leise: 'nur die Krabbe, ohne Ton',
  'nur-ton': 'nur der Ton, ohne Krabbe',
  aus: 'nichts',
}

// Liest die gemeinsame Einstellungsdatei. Gibt es sie noch nicht, kommt der alte Stand aus $.store (bis v0.5.0) hinein.
const laden = async ($: Api): Promise<Einstellungen> => {
  if (await $.fs.exists(await dateiPfad($))) return lesen($)
  const alt = aufraeumen({ modus: await $.store.get('modus'), stumm: await $.store.get('stumm') })
  await schreiben($, alt)

  return alt
}

const aendern = async ($: Api, wie: (e: Einstellungen) => Einstellungen) => {
  const neu = wie(await laden($))
  await schreiben($, neu)

  return neu
}

// Eigene Glocke über dem Eingabefeld, nur wenn der Mod skills-sammlung fehlt (der zeigt sie sonst in seiner Leiste).
const STAND = { plugin: 'fertig-krabbe', key: 'stand' } as const

const neuZeichnen = async ($: Api) => {
  try {
    const { value = 0 } = await $.state.get(STAND)
    await $.state.set(STAND, value + 1)
  } catch (fehler) {
    $.ui.log(`fertig-krabbe: Glocke nicht neu gezeichnet: ${String(fehler)}`, { to: 'debug' })
  }
}

const mitSkillsSammlung = async ($: Api) => {
  try {
    return (await $.command.list()).some(b => b.name.slice(b.name.lastIndexOf(':') + 1) === 'skill-sammlung')
  } catch {
    return false
  }
}

const glockeUmschalten = async ($: Api) => {
  try {
    const id = await $.session.id()
    const neu = await aendern($, alt => umschalten(alt, id))
    if (zustandHier(neu, id) === 'stumm' || zustandHier(neu, id) === 'ueberall-aus') erinnerungStoppen()
    await neuZeichnen($)
    $.ui.toast(TOAST[zustandHier(neu, id)])
  } catch (fehler) {
    $.ui.toast(`Krabbe ließ sich nicht umschalten: ${String(fehler)}`)
  }
}

const modusHierJetzt = async ($: Api): Promise<Modus> => modusHier(await laden($), await $.session.id())

// fertig: Claude ist durch. frage: Claude wartet auf dich (Freigabe, Auswahlfrage, Plan, Frage am Ende).
type Anlass = 'fertig' | 'frage'

const ordnerName = (pfad: string) => pfad.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? ''

// Endet die Antwort mit einer Frage an dich, ist es eine Rückfrage.
const endetMitFrage = (antwort: string) => /\?$/.test(antwort.trim().replace(/[*_`)\s]+$/, ''))

// Startet bin\krabbe.exe; das Programm löst sich sofort ab, der Aufruf wartet also nicht auf die Animation.
const winken = async ($: Api, wahl: Modus, anlass: Anlass) => {
  if (wahl === 'aus') return
  const exe = `${$.plugin.root.replace(/[\\/]+$/, '')}\\bin\\krabbe.exe`.replace(/\//g, '\\')
  const argv = [exe, '--titel', ordnerName(await $.session.cwd())]
  if (anlass === 'frage') argv.push('--frage')
  if (wahl === 'leise') argv.push('--leise')
  if (wahl === 'nur-ton') argv.push('--ohne-krabbe')

  try {
    const lauf = await $.process.run(argv, { timeoutMs: 10000 })
    if (lauf.exitCode !== 0) {
      $.ui.log(`fertig-krabbe: krabbe.exe endete mit Code ${lauf.exitCode}`, { to: 'debug' })
    }
  } catch (fehler) {
    $.ui.log(`fertig-krabbe: krabbe.exe ließ sich nicht starten: ${String(fehler)}`, { to: 'debug' })
  }
}

const frageZeigen = async ($: Api) => winken($, await modusHierJetzt($), 'frage')

// Die offene Rückfrage dieser Sitzung: worauf sie wartet (ein Werkzeug oder deine Antwort) und ihr Wecker.
let offen: { worauf: string; wecker: Timer } | undefined

const erinnerungStoppen = () => {
  offen?.wecker.cancel()
  offen = undefined
}

// Zeigt die Rückfrage-Krabbe jetzt und alle 5 Minuten wieder, bis die Rückfrage beantwortet ist.
const rueckfrage = async ($: Api, worauf: string) => {
  erinnerungStoppen()
  const zeigen = frageZeigen($)
  try {
    offen = { worauf, wecker: $.clock.every(ERINNERN_MS, () => void frageZeigen($)) }
  } catch (fehler) {
    $.ui.log(`fertig-krabbe: Erinnerung ließ sich nicht stellen: ${String(fehler)}`, { to: 'debug' })
  }
  await zeigen
}

// Hintergrundarbeit, die die Sitzung von selbst wieder weckt. Shells und Monitore wecken zwar auch, zählen aber
// nicht: sie können ewig laufen (ein Dev-Server), dann käme die Krabbe nie mehr. Wartet Claude auf einen Build im
// Hintergrund, kommt sie also weiterhin schon in der Pause.
const WECKT_NICHT = ['shell', 'monitor']
const AKTIV = ['pending', 'running', 'waiting']

// Was der Stop-Hook dieses Durchgangs über laufende Hintergrundarbeit gemeldet hat (zurückgesetzt bei turn.start).
let wartetAufHintergrund = false

// Laufen noch Hintergrund-Agenten, ist Claude nur in der Pause und macht gleich von selbst weiter.
// Teammates zählen nicht: einer in einem geschlossenen Pane bleibt für immer „running“ stehen.
const agentenLaufen = async ($: Api) => {
  try {
    return (await $.agent.list()).some(a => a.teammateId === undefined && AKTIV.includes(a.status))
  } catch (fehler) {
    $.ui.log(`fertig-krabbe: Agentenliste nicht lesbar: ${String(fehler)}`, { to: 'debug' })

    return false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await laden($)
    } catch (fehler) {
      $.ui.log(`fertig-krabbe: Einstellungen nicht lesbar: ${String(fehler)}`, { to: 'debug' })
    }
    await $.command.register({
      name: 'krabbe',
      description:
        'Fertig-Krabbe: „/krabbe“ oder „/krabbe frage“ zeigt sie jetzt, „/krabbe an | leise | nur-ton | aus“ schaltet überall um, „/krabbe hier-aus | hier-an“ nur in diesem Chat',
      argumentHint: '[frage|an|leise|nur-ton|aus|hier-aus|hier-an]',
    })

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) wartetAufHintergrund = false

    return next(e)
  })

  // Der Stop-Hook kommt vor dem Ende des Durchgangs und sagt, ob noch Hintergrundarbeit läuft.
  on('classic.Stop', async ($, e, next) => {
    const ergebnis = await next(e)
    wartetAufHintergrund =
      ergebnis.block !== undefined || (e.background_tasks ?? []).some(t => !WECKT_NICHT.includes(t.type))

    return ergebnis
  })

  // Nur wenn die Hauptsitzung fertig ist: keine Subagenten, nicht nach einem Abbruch durch dich,
  // nicht in der Pause, in der Claude auf Hintergrund-Agenten wartet (deren Ende weckt einen neuen Durchgang).
  on('turn.complete', async ($, e, next) => {
    const ergebnis = await next(e)
    if (e.agentId === undefined) {
      erinnerungStoppen()
      const pause = wartetAufHintergrund || (await agentenLaufen($))
      wartetAufHintergrund = false
      if (!e.isAborted && !pause) {
        if (endetMitFrage(e.answer)) await rueckfrage($, 'antwort')
        else await winken($, await modusHierJetzt($), 'fertig')
      }
    }

    return ergebnis
  })

  // Auswahlfrage und Plan-Freigabe warten immer auf dich, auch im Auto-Modus.
  for (const werkzeug of ['AskUserQuestion', 'ExitPlanMode']) {
    on('tool.call', { tool: werkzeug }, async ($, e, next) => {
      const zeigen = rueckfrage($, werkzeug)
      try {
        return await next(e)
      } finally {
        if (offen?.worauf === werkzeug) erinnerungStoppen()
        await zeigen
      }
    })
  }

  // Freigabe-Dialog: kommt nur, wenn dir wirklich ein Dialog gezeigt wird, nicht wenn der Auto-Modus selbst entscheidet.
  // Der Hook endet schon, bevor du entscheidest; beantwortet ist er, sobald dieses Werkzeug durch ist (unten).
  on('classic.PermissionRequest', async ($, e, next) => {
    const zeigen = rueckfrage($, e.tool_name)
    const ergebnis = await next(e)
    await zeigen

    return ergebnis
  })

  // Hast du freigegeben oder abgelehnt, endet der Aufruf des wartenden Werkzeugs: Erinnerung aus.
  on('tool.call', async ($, e, next) => {
    try {
      return await next(e)
    } finally {
      if (offen?.worauf === e.tool) erinnerungStoppen()
    }
  })

  // Du schreibst etwas: Die Rückfrage gilt als beantwortet.
  on('prompt.submit', async ($, e, next) => {
    erinnerungStoppen()
    await neuZeichnen($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const darunter = await next(e)
    if (e.props.hasSurvey || (await mitSkillsSammlung($))) return darunter
    const { Box, Button } = $.ui.resolve(e)
    await $.state.get(STAND)
    const glocke = SYMBOL[zustandHier(await lesen($), await $.session.id())]

    return (
      <Box flexDirection="column">
        {darunter}
        <Box flexDirection="row">
          <Button key="krabbe-glocke" label={glocke} variant="secondary" onPress={() => glockeUmschalten($)} />
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'krabbe' }, async ($, e) => {
    await neuZeichnen($)

    const wunsch = (e.args ?? '').trim().toLowerCase().replace(/\s+/g, '-')
    const id = await $.session.id()

    if (wunsch === 'hier-aus' || wunsch === 'hier-an') {
      const an = wunsch === 'hier-an'
      const neu = await aendern($, alt => hierSetzen(alt, id, an))
      if (!an) erinnerungStoppen()

      return {
        text: an
          ? zustandHier(neu, id) === 'nur-hier-an'
            ? 'Die Krabbe ist überall aus, in diesem Chat aber an (Ton und Krabbe).'
            : `Fertig-Krabbe ist in diesem Chat an: ${BESCHREIBUNG[neu.modus]}.`
          : 'Fertig-Krabbe ist in diesem Chat aus (kein Ton, keine Krabbe, keine Erinnerungen), bis /krabbe hier-an. Nach /clear gilt das nicht mehr.',
      }
    }

    if (wunsch === '' || wunsch === 'test' || wunsch === 'frage') {
      const jetzt = await laden($)
      const wahl = jetzt.modus
      await winken($, wahl === 'aus' ? 'an' : wahl, wunsch === 'frage' ? 'frage' : 'fertig')
      const hier: Record<string, string> = {
        stumm: ' In diesem Chat ist sie aus (/krabbe hier-an).',
        'nur-hier-an': ' In diesem Chat ist sie trotzdem an (/krabbe hier-aus).',
      }

      return {
        text: `Fertig-Krabbe ist überall auf „${wahl}“ (${BESCHREIBUNG[wahl]}).${hier[zustandHier(jetzt, id)] ?? ''} Umschalten mit /krabbe an | leise | nur-ton | aus, nur diesen Chat mit /krabbe hier-aus | hier-an oder dem Glocken-Knopf, Rückfrage-Krabbe testen mit /krabbe frage.`,
      }
    }

    if (!isModus(wunsch)) {
      return { text: `„${wunsch}“ kenne ich nicht. Möglich: /krabbe frage | an | leise | nur-ton | aus | hier-aus | hier-an` }
    }

    const neu = await aendern($, alt => modusSetzen(alt, wunsch))
    const hier = zustandHier(neu, id) === 'stumm' ? ' Dieser Chat bleibt aus, bis /krabbe hier-an.' : ''

    return { text: `Fertig-Krabbe ab jetzt überall: ${BESCHREIBUNG[wunsch]}.${hier}` }
  })
}
