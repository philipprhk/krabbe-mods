# krabbe-mods

Zwei Mods für Claude Code (Windows). Jeder läuft für sich allein; zusammen teilen sie sich die Krabben-Glocke.

## fertig-krabbe

Sobald Claude fertig ist, kommt ein kurzer Ton und eine winkende Pixel-Krabbe unten rechts. Bei Rückfragen gibt es eine eigene Variante, die alle 5 Minuten wiederkommt, bis du antwortest.

Befehl: `/krabbe [frage|an|leise|nur-ton|aus|hier-aus|hier-an]` (`hier-…` gilt nur für den aktuellen Chat).

Über dem Eingabefeld sitzt eine Glocke für den aktuellen Chat (ist auch `skills-sammlung` installiert, sitzt sie in deren Leiste):

| Glocke | Bedeutung |
|---|---|
| 🔔 | Krabbe in diesem Chat an |
| 🔕 | Krabbe nur in diesem Chat aus |
| 🔕 all | Krabbe überall aus |
| 🔔 (🔕 all) | überall aus, nur in diesem Chat an |

Einstellungen: `%USERPROFILE%\.claude\mods-daten\fertig-krabbe.json`.

## skills-sammlung

Leiste über dem Eingabefeld mit „🧩 Skills“: ein Fenster mit allen **bei dir installierten** Skills, nach Bereich oder Herausgeber; ein Klick setzt den Befehl ins Eingabefeld. Außerdem, nur wenn vorhanden: „🏁 Sitzung beenden“ (wenn es einen Skill `sitzung-beenden` gibt) und die Krabben-Glocke (wenn `fertig-krabbe` installiert ist).

So werden Skills einsortiert, in dieser Reihenfolge:

1. **Deine eigene Datei** `%USERPROFILE%\.claude\mods-daten\skills-katalog.json` (optional):
   ```json
   {
     "skills": {
       "mein-skill": { "herausgeber": "Eigene", "bereich": "Mein Projekt" }
     },
     "reihenfolge": ["Mein Projekt"]
   }
   ```
   `reihenfolge` nennt Gruppen, die im Fenster zuerst kommen.
2. **Mitgelieferter Katalog** bekannter, öffentlicher Skill-Pakete (`skills-sammlung/hooks/katalog.ts`).
3. **Regel für alles andere:** Herausgeber ist das Plugin, aus dem der Skill kommt (eigene Skills: „Eigene“); der Bereich ergibt sich aus Stichwörtern in Name und Beschreibung (z. B. „pdf“ → Texte & Dokumente, „animation“ → Animation & Motion). Ohne Treffer: „Sonstiges“.

## Installieren

Beide oder nur einen:

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

- `fertig-krabbe/bin/krabbe.exe` ist aus `fertig-krabbe/src/Krabbe.cs` gebaut und nicht signiert; Windows kann beim ersten Start nachfragen. Selbst bauen: `fertig-krabbe/build.ps1` (nutzt den C#-Compiler aus .NET Framework 4, liegt bei Windows dabei).
- Die Mod-Schnittstelle von Claude Code ist noch in Entwicklung; nach einem Claude-Code-Update kann etwas brechen.
