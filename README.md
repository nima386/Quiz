# FORGE — Training PWA

> Train smart. Log fast. Progress always.

iPhone-optimierte Progressive Web App für Training, Ernährung und Gewohnheiten.

## Features

- **Training** — Kalender, Tagesplan (Push/Pull/Legs), Live-Set-Tracking, PR-Verlauf
- **Ernährung** — Kalorien-Ring, Makros, Mahlzeiten, Hydration-Tracker
- **Habits** — Streaks mit Freeze-Tokens, tägliche Gewohnheiten
- **Offline-fähig** — Service Worker cached alle Assets
- **iPhone-PWA** — Safe-Area-Insets, Standalone-Mode, Home-Screen Install

## Deployment auf GitHub Pages

### 1. Repository erstellen
```bash
cd C:\Users\Administrator\OneDrive\Documents\trainings-app
git init
git add .
git commit -m "Initial FORGE PWA"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/trainings-app.git
git push -u origin main
```

### 2. GitHub Pages aktivieren
1. Auf GitHub: **Settings → Pages**
2. Unter **Build and deployment** wähle:
   - **Source:** GitHub Actions
3. Der Workflow `.github/workflows/pages.yml` deployt automatisch nach jedem Push.

### 3. App öffnen
Nach 1-2 Minuten verfügbar unter:
```
https://DEIN-USERNAME.github.io/trainings-app/
```

## Auf iPhone installieren

1. URL in **Safari** öffnen (nicht Chrome!)
2. **Teilen-Button** unten antippen
3. **„Zum Home-Bildschirm"** wählen
4. App erscheint als Standalone-Icon ohne Browser-UI

## Datenspeicherung

Alle Daten lokal im Browser (`localStorage`). Kein Backend, kein Tracking.
- Sets, Habits, Hydration werden tagesweise gespeichert
- Beim Neuinstallieren der App: Daten gehen verloren

## Tech Stack

- Vanilla HTML / CSS / JavaScript
- Keine Frameworks, keine Build-Tools
- Service Worker für Offline-Support
- Web App Manifest für PWA-Install

## Lokal testen

```bash
# Mit Python
python -m http.server 8000

# Mit Node
npx http-server -p 8000

# Dann öffnen:
# http://localhost:8000
```
