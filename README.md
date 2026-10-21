# krabbe-mods

Zwei Mods für Claude Code (Windows):

- **fertig-krabbe**: Sobald Claude fertig ist, kommt ein kurzer Ton und eine winkende Pixel-Krabbe unten rechts. Bei Rückfragen gibt es eine eigene Variante, die alle 5 Minuten wiederkommt, bis du antwortest. Befehl: `/krabbe [frage|an|leise|nur-ton|aus|hier-aus|hier-an]`.
- **skills-sammlung**: Knöpfe über dem Eingabefeld: „🧩 Skills“ (Fenster mit allen installierten Skills), „🏁 Sitzung beenden“ (setzt `/sitzung-beenden` ins Eingabefeld; braucht einen eigenen Skill dieses Namens) und die Krabben-Glocke für den aktuellen Chat:

| Glocke | Bedeutung |
|---|---|
| 🔔 | Krabbe in diesem Chat an |
| 🔕 | Krabbe nur in diesem Chat aus |
| 🔕 all | Krabbe überall aus |
| 🔔 (🔕 all) | überall aus, nur in diesem Chat an |

Die Glocke braucht beide Mods. Die Einstellungen liegen in `%USERPROFILE%\.claude\mods-daten\fertig-krabbe.json`.

## Installieren

```bash
claude plugin marketplace add philipprhk/krabbe-mods
claude plugin install fertig-krabbe@krabbe-mods
claude plugin install skills-sammlung@krabbe-mods
```

Danach die Claude-App neu starten.

## Aktualisieren

```bash
claude plugin marketplace update krabbe-mods
claude plugin update fertig-krabbe@krabbe-mods
claude plugin update skills-sammlung@krabbe-mods
```

Danach neu starten.

## Hinweise

- `fertig-krabbe/bin/krabbe.exe` ist aus `fertig-krabbe/src/Krabbe.cs` gebaut und nicht signiert; Windows kann beim ersten Start nachfragen. Wer lieber selbst baut: `fertig-krabbe/build.ps1` (nutzt den C#-Compiler aus .NET Framework 4, liegt bei Windows dabei).
- Die Mod-Schnittstelle von Claude Code ist noch in Entwicklung; nach einem Claude-Code-Update kann etwas brechen.
