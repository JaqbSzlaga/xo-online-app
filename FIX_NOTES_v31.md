# XO Online v31.0 — Stable modes fix

## Co zostało naprawione

- Naprawiono rewanż po wygranej rundzie w trybie Classic.
- Zabezpieczono panel końca rundy i przycisk rewanżu przed przykrywaniem przez warstwy UI/CSS.
- Ustabilizowano rozmiary planszy Classic i Studenckiej, żeby plansza się nie rozjeżdżała.
- Naprawiono tryb Studencki po zamknięciu małej planszy — klient nie pozwala już wybierać pełnych lub niedostępnych plansz.
- Naprawiono blokowanie gry przez „Pierwszą krew”, gdy nie ma dwóch sensownych plansz do zamiany.
- Bot w trybie Studenckim nie powinien już blokować rozgrywki, gdy musi obsłużyć wybór planszy albo „Pierwszą krew”.
- Dodano `available_boards` do stanu wysyłanego z serwera, żeby frontend i backend używały tej samej logiki dostępnych plansz.
- Zmieniono service worker na wersję network-first i podbito cache do v31.0, żeby przeglądarka nie trzymała starego, popsutego JS/CSS.
- Uporządkowano paczkę: usunięto duplikaty plików z katalogu głównego i stare nieużywane mostki JS.

## Struktura po czyszczeniu

- `app.py` — backend Flask/Socket.IO i pełna logika gry.
- `templates/index.html` — jedyny właściwy widok aplikacji.
- `static/game.js` — główny frontend i renderowanie trybów.
- `static/app-paper-template.js` — wygląd/paper UI.
- `static/bot-v27-bridge.js` — poprawki UI pod tryb bota.
- `static/public-v28-bridge.js` — pokoje publiczne / szybki mecz.
- `static/match-chat-v29-bridge.js` — mecz do 3/5 i czat.
- `static/student-v30-3-fix.js` — kosmetyczne uzupełnienia Studenckiego.
- `static/style.css` — style, z końcowym blokiem stabilizującym v31.0.
- `static/service-worker.js` — cache/PWA.

## Testy wykonane lokalnie

- `python3 -m py_compile app.py`
- `node --check static/game.js`
- test Socket.IO: Classic win + rematch
- test Socket.IO: Studencki pierwszy ruch
- test Socket.IO: bot Classic odpowiada na ruch gracza
- test Socket.IO: Pierwsza krew nie blokuje gry, gdy nie ma dwóch plansz do zamiany

Uwaga: test wizualny w Chromium na localhost nie mógł zostać wykonany w tym środowisku, bo uruchomienie strony lokalnej zostało zablokowane przez politykę przeglądarki. Logika i składnia przeszły testy.
