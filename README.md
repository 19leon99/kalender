# Unser Kalender

Gemeinsamer Kalender für zwei Personen als Web-App. Läuft auf dem iPhone und auf Android, lässt sich auf den Home-Bildschirm legen und braucht für die zweite Person kein Konto.

- Drei Eintragsarten: Person 1 (dunkelgrün), Laura (rosa), gemeinsam (hellblau)
- Einmalige Termine und Serien (täglich, wöchentlich mit Wochentagen, monatlich, jährlich; Ende nie, am Datum oder nach Anzahl)
- Serien ändern oder löschen für nur diesen, alle zukünftigen oder alle Termine
- Monat, Woche und Liste mit Filter nach Person und Einmalig/Serie
- Import von .ics-Dateien aus Apple Kalender und TimeTree, doppelte Termine werden zu gemeinsamen
- Export als .ics, einzelne Termine per Teilen-Menü verschicken
- Zahl der heutigen Termine am App-Symbol (iPhone ab iOS 16.4 nach dem Hinzufügen zum Home-Bildschirm, Android in Chrome)

Die Daten liegen in Firebase Firestore, im selben Projekt wie die To-do-Liste. Die App selbst liegt kostenlos auf GitHub Pages.

## Einrichtung (ca. 20 Minuten, einmalig)

### 1. Firestore-Regeln ergänzen

In der [Firebase-Konsole](https://console.firebase.google.com) das Projekt öffnen, links **Firestore Database › Regeln**. Den `match /kalender/...`-Block aus `firestore.rules` innerhalb von `match /databases/{database}/documents { … }` neben die bestehenden Regeln der To-do-Liste einfügen und **Veröffentlichen**. Die bestehenden Regeln bleiben, wie sie sind.

Der Kalender braucht keine Anmeldung. Wie bisher schützt der geheime Kalender-Schlüssel aus dem Einladungslink die Termine: Ohne ihn kommt man an keinen Termin, und die Liste aller Kalender lässt sich nicht abrufen.

### 2. Einstellungen eintragen

In `config.js` die Namen und unter `firebase` die Werte aus **Projekteinstellungen › Allgemein › Meine Apps › Web-App** (`apiKey`, `authDomain`, `projectId`, `appId`) eintragen. Diese Werte dürfen öffentlich im Code stehen.

Falls der API-Schlüssel in der Google Cloud Console auf bestimmte Websites beschränkt ist, muss `https://<dein-github-name>.github.io/*` erlaubt sein.

### 3. Auf GitHub hochladen und veröffentlichen

1. Auf GitHub ein neues Repository anlegen, z. B. `kalender`.
2. Alle Dateien dieses Ordners hochladen (**Add file › Upload files**, alles hineinziehen, **Commit changes**).
3. **Settings › Pages**: unter *Build and deployment* als Quelle **Deploy from a branch**, Branch **main**, Ordner **/ (root)** wählen, speichern.
4. Nach ein bis zwei Minuten läuft die App unter `https://<dein-github-name>.github.io/kalender/`.

Das Repository kann öffentlich sein: Im Code stehen keine Termine und kein Geheimnis. Die Termine sind nur über den Einladungslink erreichbar.

### 4. Kalender anlegen und Laura einladen

1. Die Adresse auf dem iPhone in Safari öffnen, „Ich bin Leon“ wählen.
2. Unter **Zugang** auf **Neuen gemeinsamen Kalender anlegen** tippen.
3. Den Einladungslink kopieren oder über das Teilen-Menü schicken. Wer den Link hat, kann alles sehen und ändern, also nur an Laura schicken.
4. Auf den Home-Bildschirm legen: in Safari **Teilen › Zum Home-Bildschirm**. Auf Android in Chrome: Menü **⋮ › Zum Startbildschirm hinzufügen** bzw. **App installieren**.

Wichtig fürs iPhone: Die App auf dem Home-Bildschirm hat einen eigenen Speicher, getrennt von Safari. Beim ersten Öffnen vom Home-Bildschirm unter **Zugang** den Einladungslink einfügen und **Verbinden** tippen. Das gilt für beide Personen, falls ihr iPhones nutzt. Auf Android teilen Chrome und die installierte App den Speicher.

### Umzug von Supabase

Am 9. November 2026 sind die Termine von Supabase nach Firestore umgezogen. Der Supabase-Zugang ist aus `config.js` entfernt.

## Alte Termine übernehmen

**Apple Kalender:** am Mac in der Kalender-App den Kalender auswählen, **Ablage › Exportieren › Exportieren…**. Die iPhone-App kann nicht exportieren.

**TimeTree:** TimeTree hat keinen eigenen Export. Das inoffizielle Tool [TimeTree-Exporter](https://github.com/eoleedi/TimeTree-Exporter) erzeugt eine .ics-Datei:

```
pip install timetree-exporter
timetree-exporter -o timetree.ics
```

Das Tool fragt nach E-Mail und Passwort von TimeTree, deshalb sollte Laura es selbst ausführen. Es nutzt inoffizielle Schnittstellen und kann ohne Vorwarnung aufhören zu funktionieren.

Beide Dateien in der App unter **Import** hochladen. Dateien mit „timetree“ im Namen werden automatisch Laura zugeordnet, die Zuordnung lässt sich pro Datei ändern. Termine mit gleichem Titel und gleicher Startzeit in beiden Dateien werden ein gemeinsamer Termin. Termine, die schon im Kalender stehen, werden übersprungen, ein zweiter Import legt also keine Doppelten an.

Grenzen beim Import: Serien wie „jeden zweiten Dienstag im Monat“ werden als monatlich am selben Datum übernommen, stündliche Serien als Einzeltermin. Zeitzonen werden als deutsche Ortszeit gelesen.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Startseite der App |
| `app.js` | Ansichten, Serienlogik, Import und Export |
| `styles.css` | Farben und Layout, mit Dunkelmodus |
| `config.js` | Namen und Firebase-Zugang |
| `manifest.webmanifest`, `sw.js`, `icons/` | App auf dem Home-Bildschirm, offline nutzbar |
| `firestore.rules` | Zugriffsregeln für Firestore |

## Ohne Firebase ausprobieren

Lässt man `firebase` weg, läuft die App mit Beispielterminen nur im eigenen Browser. Zum lokalen Testen im Ordner `python3 -m http.server` starten und `http://localhost:8000` öffnen.

## Wenn etwas nicht klappt

- **Änderungen von Laura erscheinen nicht:** Die App holt neue Termine alle 30 Sekunden und beim Öffnen. Kurz in eine andere App wechseln und zurück.
- **„Keine Verbindung“:** Prüfen, ob die Firestore-Regeln veröffentlicht sind (Schritt 1). In der Browser-Konsole steht bei fehlenden Rechten „Missing or insufficient permissions“.
- **Link verloren:** Auf einem verbundenen Gerät unter **Zugang** neu kopieren.
- **Link ist in falsche Hände geraten:** Unter **Zugang** gibt es keinen „Link ändern“. Dann einen neuen Kalender anlegen, vorher alle Termine exportieren und danach importieren.
