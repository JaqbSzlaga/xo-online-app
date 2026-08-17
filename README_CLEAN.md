# XO Chaos Online — v32-art

## Co dodaje

- Graficzny ekran główny w stylu papierowo-rysunkowym.
- Grafiki SVG:
  - papierowe tło,
  - karteczka XO,
  - kafelek Classic,
  - kafelek Studencki.
- Kliknięcie Play nie odpala gry pod menu.
- Play otwiera osobną `Kartę pokoju`.
- Z karty pokoju można:
  - utworzyć pokój/start gry,
  - wejść do pokoi publicznych,
  - wpisać kod pokoju,
  - wrócić do menu.
- Instrukcja ma górny poziomy suwak/zakładki.
- Po kliknięciu zakładki pokazuje się tylko instrukcja tego segmentu.

## Widoczna wersja

```text
v32-art
```

## Podmień/dodaj

```text
app.py
templates/index.html
static/game.js
static/style.css
static/service-worker.js
static/manifest.json
static/art/paper-bg.svg
static/art/paper-note.svg
static/art/classic-card.svg
static/art/student-card.svg
README_CLEAN.md
```

Po deployu:
Render -> Manual Deploy -> Clear build cache & deploy.
