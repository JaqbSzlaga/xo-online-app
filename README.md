# XO Chaos Online — v22-paper-template-full

Pełna paczka aplikacji Flask + Socket.IO + PWA.

## Co jest w tej wersji

- papierowy/ręcznie rysowany ekran menu jak z wybranego szablonu,
- dolny pasek: Ranking, Profil, Znajomi, Nagrody, Sklep,
- Classic i Studencki,
- Online 1v1, Lokalnie 1v1, Bot,
- Nagła śmierć,
- Chaos: ukryty, ostrzegany, brutalny,
- Pierwsza krew,
- rewanż, reset punktów, licznik wyniku,
- PWA i ikony,
- wersja w prawym dolnym rogu: `v22-paper-template-full`.

## Lokalnie

```bash
pip install -r requirements.txt
python app.py
```

## Render

Build Command:
```bash
pip install -r requirements.txt
```

Start Command:
```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
```


## v23-game-buttons-lastmove

Pełna paczka aplikacji, nie patch.

Zmiany:
- potwierdzono i zachowano podświetlanie ostatniego ruchu w Classic i Studenckim,
- dodano przycisk `Podświetl ostatni ruch` pod planszą,
- przeniesiono duże akcje gry pod planszę,
- dodano górne przyciski: `Instrukcja`, `Link`, `Czat`,
- `Czat` jest na razie przyciskiem testowym pod przyszłą funkcję,
- `Wróć do menu` jest teraz dużym, widocznym przyciskiem pod planszą,
- podbito cache PWA do `xo-online-pwa-v23-game-buttons-lastmove`.


## v24-clean-game-header-localfix

Pełna wersja aplikacji z poprawkami ekranu gry:

- ostatni ruch świeci automatycznie cały czas — bez osobnego przycisku,
- nad planszą są przyciski: Instrukcja, Link, Czat,
- pod planszą został tylko duży przycisk `Wróć do menu`,
- poprawiono lokalny tryb Studencki: wybór nowej planszy po trafieniu w zamkniętą/wygraną planszę nie blokuje już gry na jednym urządzeniu.
