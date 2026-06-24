# XO Online v31.0 — Stable modes

Ta paczka zawiera uporządkowaną wersję aplikacji po naprawach trybów Classic, Studencki i Bot. Szczegóły zmian są w `FIX_NOTES_v31.md`.

## Uruchomienie lokalne

```bash
pip install -r requirements.txt
python app.py
```

Na Render zostają pliki: `runtime.txt`, `requirements.txt`, `Procfile`, `render.yaml`.

---

# Kółko i Krzyżyk Online — Full Step 1

Wersja online 1v1 przez link/pokój.

## Co działa

- Classic online,
- Studencki/Ultimate online,
- link do pokoju,
- kod pokoju,
- gracz X i gracz O,
- licznik punktów,
- rewanż,
- reset wyniku,
- bez limitu,
- do 3 wygranych,
- do 5 wygranych,
- zmiana zaczynającego,
- PL/ENG,
- instrukcja,
- ostatni ruch,
- fajerwerki po wygranej.

## Uruchomienie

```bash
pip install -r requirements.txt
python app.py
```

Adres lokalny:

```text
http://127.0.0.1:5000
```

Tunel Cloudflare:

```bash
cloudflared tunnel --url http://localhost:5000
```

Dziewczynie wysyłasz link Cloudflare, nie `127.0.0.1`.


## Mobile fix

Ta wersja poprawia responsywność planszy Studenckiej/Ultimate na telefonie: siatki nie powinny już wychodzić poza ramkę ani rozjeżdżać się po wstawieniu X/O.


## Zasada większości w trybie Studenckim

Jeżeli wszystkie małe plansze zostaną zamknięte i nikt nie ułoży 3 przejętych plansz w poziomie, pionie ani po skosie, wygrywa gracz z większą liczbą przejętych małych plansz. Jeśli liczba przejętych plansz jest równa, jest remis.


## Wygodniejszy wybór planszy

W trybie Studenckim, gdy zwycięzca wskazanej planszy wybiera nową planszę, można teraz kliknąć dowolne pole na wybranej planszy. Ten klik tylko wybiera planszę — właściwy ruch wykonuje się dopiero następnym kliknięciem.


## PWA — aplikacja na telefon

Ta wersja ma dodane pliki PWA:

- `static/manifest.json`
- `static/service-worker.js`
- `static/icon-192.png`
- `static/icon-512.png`
- `static/icon-maskable-512.png`

### Android / Chrome

1. Otwórz publiczny link do gry.
2. Kliknij menu `⋮`.
3. Wybierz `Dodaj do ekranu głównego` albo `Zainstaluj aplikację`.
4. Na ekranie telefonu pojawi się ikona `XO Online`.

### iPhone / Safari

1. Otwórz publiczny link do gry w Safari.
2. Kliknij ikonę udostępniania.
3. Wybierz `Do ekranu początkowego`.
4. Potwierdź dodanie.

### Ważne

PWA wymaga publicznego adresu HTTPS. Link z `trycloudflare.com` działa do testów, ale po zamknięciu tunelu przestaje działać. Do stałej aplikacji najlepiej wrzucić projekt na hosting z HTTPS.


# Deploy na Render

Na Render wybierz `Web Service`, nie `Static Site`, bo ta gra ma backend Flask + Socket.IO/WebSocket.

## Build Command

```bash
pip install -r requirements.txt
```

## Start Command

```bash
gunicorn --worker-class eventlet -w 1 app:app
```

## Plan

Do testów możesz wybrać plan `Free`.


## Tryb Nagła śmierć

W ustawieniach pokoju można włączyć `Nagła śmierć`.
Po zaznaczeniu pojawia się wybór czasu na ruch: 5 / 10 / 15 sekund.

Zasady:
- jeśli gracz nie wykona ruchu w czasie, jego kolejka zostaje pominięta,
- w trybie Studenckim, jeśli czas minie podczas wyboru planszy, system wybiera losową dostępną planszę,
- wybór czasu jest widoczny dopiero po włączeniu trybu Nagła śmierć.


## Fix Render / Python 3.14 + eventlet

Jeśli Render pokazuje błąd:

`eventlet.green.thread has no attribute start_joinable_thread`

to znaczy, że aplikacja została uruchomiona na Pythonie 3.14. Ta paczka wymusza Python 3.11.9 przez:

- `.python-version`
- `runtime.txt`
- `render.yaml -> envVars -> PYTHON_VERSION=3.11.9`

Start Command:

```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
```


## Fix instalacji PWA w Chrome

Poprawiono rejestrację service workera:

- wcześniej: `/static/service-worker.js`
- teraz: `/service-worker.js` ze scope `/`

Dzięki temu service worker kontroluje stronę główną `/`, czyli start URL aplikacji.
Po wrzuceniu tej wersji na Render najlepiej na telefonie odświeżyć stronę 2 razy albo wyczyścić dane strony, żeby Chrome pobrał nowy service worker.


## Reconnect / powrót do pokoju

Dodano stabilny `client_id` w `localStorage`, dzięki czemu po odświeżeniu strony albo krótkim rozłączeniu gracz może wrócić do tego samego pokoju i odzyskać swoje X/O.

Zasada:
- gracz nie jest usuwany z pokoju natychmiast po `disconnect`,
- aktywne połączenie jest usuwane, ale symbol X/O zostaje przypisany do danego telefonu/przeglądarki,
- po ponownym wejściu z tym samym linkiem gracz odzyskuje symbol,
- pusty pokój jest czyszczony dopiero po około 10 minutach.

## Pytajnik w trakcie gry

Na ekranie gry dodano przycisk `?`, który otwiera instrukcję w oknie modalnym bez wychodzenia z pokoju i bez przerywania rozgrywki.

## Cache PWA

Podbito wersję cache service workera, żeby telefon łatwiej pobierał nowe pliki po deployu.


## Tryb Chaos

Działa tylko w trybie Studenckim.

Co 30 sekund gra resetuje jedną losową małą planszę:
- usuwa z niej symbole,
- usuwa jej właściciela,
- plansza wraca do gry jako pusta.

Warianty:
- `Ostrzeżenie 5 s` — plansza świeci się przed zmianą,
- `Ukryty chaos` — plansza resetuje się bez ostrzeżenia.

## Pierwsza krew

Działa tylko w trybie Studenckim.

Pierwszy gracz, który przejmie małą planszę, dostaje jednorazową moc.
Moc można zachować na później.

Moc pozwala zamienić miejscami dwie małe plansze:
- zamienia ich pola,
- zamienia właścicieli,
- zamienia linie wygranej,
- jeżeli zamiana utworzy 3 przejęte plansze w linii, gracz może wygrać po użyciu mocy.


## Tryb Chaos — pełna wersja

Dostępny tylko w trybie Studenckim. Co 30 sekund gra uruchamia chaos.

Warianty:
- `Chaos ukryty` — bez ostrzeżenia resetuje jedną niepustą planszę.
- `Chaos ostrzegany` — plansza świeci na czerwono 5 sekund przed resetem.
- `Chaos sprawiedliwy` — wybiera tylko plansze bez właściciela, czyli nie rusza już przejętych plansz.
- `Chaos brutalny` — może ruszyć także przejętą planszę.

Dodatek:
- `Rozpad symbolu` — widoczny tylko przy Brutalnym chaosie. Zamiast resetować całą planszę, usuwa jeden losowy symbol z jednej planszy.

## Pierwsza krew

Dostępna tylko w trybie Studenckim. Pierwszy gracz, który przejmie małą planszę, dostaje jednorazową moc.
Moc pozwala wybrać dokładnie dwie małe plansze i zamienić je miejscami.


## Zmiana zasad Chaosu

Chaos działa teraz po losowym czasie od 30 do 60 sekund.

Warianty:
- `Chaos ukryty` — bez ostrzeżenia zamienia miejscami dwie niepuste plansze.
- `Chaos ostrzegany` — jedna plansza świeci przez 5 sekund, potem zamienia się miejscami z inną planszą.
- `Chaos brutalny` — jedyny wariant, który resetuje planszę. Może zresetować także planszę przejętą.

Dodatek:
- `Rozpad symbolu` — tylko przy Brutalnym chaosie. Zamiast resetu całej planszy usuwa jeden losowy symbol z jednej planszy.


## Tryby gry: online / lokalnie / bot

Dodano wybór trybu gry:
- `Online 1v1` — gra przez link,
- `Lokalnie 1v1` — dwie osoby grają na jednym urządzeniu,
- `Gra z botem` — gracz X kontra bot O.

## Nowa logika Chaosu

Zwykły chaos wybiera tylko plansze:
- niepuste,
- jeszcze nieprzejęte.

Brutalny chaos:
- może zamieniać także plansze przejęte,
- nie resetuje już całej planszy,
- działa naprzemiennie:
  1. zamiana dwóch niepustych plansz,
  2. usunięcie jednego losowego symbolu z losowej planszy.


## Fix instrukcji Chaosu

Poprawiono instrukcję PL/ENG w `static/game.js`, żeby opisywała aktualną logikę:
- zwykły chaos rusza tylko niepuste i nieprzejęte plansze,
- zwykły chaos zamienia dwie plansze miejscami,
- brutalny chaos nie resetuje całej planszy,
- brutalny chaos działa naprzemiennie: zamiana plansz / usunięcie jednego symbolu.
Podbito cache PWA do `v7-rules-fixed`.


## Fix lokalnie 1v1

Poprawiono tryb lokalny: serwer rozpoznaje aktualny symbol po turze (`X` albo `O`), a nie po stałym graczu z połączenia. Dzięki temu po ruchu X można normalnie postawić O na tym samym urządzeniu.

## Fix Pierwszej krwi

Pierwsza krew pozwala teraz wybrać dowolne dwie niepuste małe plansze:
- plansze z symbolami,
- plansze przejęte,
- plansze nie muszą być wygrane.

Po wybraniu dwóch plansz są one zamieniane miejscami.


## Fix PL/ENG i instrukcji

Naprawiono uszkodzony obiekt `TEXTS` w `static/game.js`.
W poprzedniej wersji została tylko jedna sekcja `rules`, przez co instrukcja mogła pokazywać się tylko po angielsku i przełącznik PL/ENG nie działał poprawnie.

Teraz są osobne pełne sekcje:
- `TEXTS.PL`
- `TEXTS.ENG`

Podbito cache PWA do `v9-lang-rules-fix`.


## Fix rozłączeń online / auto rejoin

Dodano automatyczny powrót do pokoju po:
- reconnect Socket.IO,
- powrocie z tła aplikacji,
- ponownym fokusie okna,
- odświeżeniu linku z `?room=KOD`.

Problem był taki, że po uśpieniu telefonu lub przełączeniu Messengera/Chrome Socket.IO dostawał nowe połączenie, ale frontend nie zawsze ponownie wysyłał `join_room_by_code`. Drugi gracz widział wtedy `Rozłączony: X`.

Cache PWA: `v10-socket-rejoin`.


## Fix Chaosu i Pierwszej krwi

### Chaos
- przy ostrzeżeniu gra od razu wybiera konkretną parę plansz do zamiany,
- po 5 sekundach zamienia dokładnie tę parę,
- ukryty chaos od razu losuje parę i wykonuje zamianę,
- jeśli brakuje minimum dwóch poprawnych plansz, chaos czeka do kolejnego losowego czasu.

### Pierwsza krew
- działa tylko od razu po zdobyciu pierwszej planszy,
- gra zatrzymuje dalszą turę i czeka na wybór dwóch plansz,
- kliknięcie działa na polach planszy, nie trzeba trafiać w obrys,
- po zamianie dwóch plansz gra przechodzi dalej.


## FINAL JS syntax fix

Naprawiono krytyczny błąd w `static/game.js`:
- instrukcje PL/ENG były zapisane jako zwykłe stringi z prawdziwymi enterami,
- przeglądarka zatrzymywała cały JavaScript,
- przez to nie działało tworzenie pokoju i nie pokazywały się opcje trybu Studenckiego.

W tej wersji `TEXTS.PL.rules` i `TEXTS.ENG.rules` są zapisane poprawnie.
Sprawdzono składnię `game.js` przez `node --check`.
Cache PWA: `v12-final-js-syntax-fix`.


## Chaos swap reliability fix

Poprawiono działanie Chaosu:
- Chaos do zamiany plansz używa teraz tej samej funkcji co Pierwsza krew: `swap_student_boards`,
- przy ostrzeżeniu zapamiętywana jest konkretna para plansz,
- po 5 sekundach zamieniana jest dokładnie ta para,
- jeśli nie ma minimum dwóch poprawnych plansz do zamiany, gra pokazuje komunikat zamiast wyglądać jakby nic się nie stało,
- cache PWA: `v13-chaos-swap-reliable`.


## Chaos zero timer fix

Naprawiono sytuację, w której licznik Chaosu dochodził do `0s` i nie wykonywał efektu ani nie startował od nowa.

Zmiany:
- `run_chaos_tick` zawsze po upływie czasu robi jedną z trzech rzeczy:
  1. pokazuje ostrzeżenie,
  2. wykonuje efekt,
  3. pokazuje komunikat, że jest za mało plansz, i losuje nowy czas.
- po wykonaniu efektu `finish_chaos_cycle()` zawsze ustawia nowy losowy czas,
- Chaos do zamiany używa tej samej funkcji co Pierwsza krew: `swap_student_boards`,
- cache PWA: `v14-chaos-zero-fix`.


## Chaos server time fix

Naprawiono mylące `0s` w liczniku Chaosu.

Przyczyna:
- klient liczył czas przez `Date.now()` telefonu,
- serwer Rendera używa własnego czasu,
- przy różnicy zegara telefon mógł pokazywać `0s`, mimo że według serwera czas jeszcze nie minął.

Zmiany:
- serwer wysyła `server_now`,
- frontend liczy Chaos według czasu serwera,
- dodano awaryjne odświeżenie, gdyby stan Chaosu utknął,
- cache PWA: `v15-chaos-server-time`.


## Chaos heartbeat fix

Przerobiono Chaos tak, żeby nie zależał wyłącznie od background loopa Rendera.

Zmiany:
- dodano event Socket.IO `chaos_ping`,
- aktywny klient wysyła `chaos_ping` co 1 sekundę,
- serwer przy każdym pingu sprawdza `run_chaos_tick(room)`,
- jeśli Chaos ma zadziałać, wykonuje ostrzeżenie/zmianę i wysyła nowy stan pokoju,
- zachowano background watcher jako dodatkowe zabezpieczenie,
- cache PWA: `v16-chaos-heartbeat`.

To rozwiązuje sytuację, w której licznik dochodził do `0s`, ale serwerowy background task nie wykonywał zamiany.


## Usunięcie wariantu Chaos sprawiedliwy

Usunięto `Chaos sprawiedliwy`, ponieważ przy aktualnych zasadach działał tak samo jak `Chaos ostrzegany`.

Zostają warianty:
- `Chaos ukryty`,
- `Chaos ostrzegany`,
- `Chaos brutalny`.

Jeśli stary klient albo stary pokój wyśle `fair`, serwer automatycznie potraktuje to jako `warned`.
Cache PWA: `v17-no-fair-chaos`.


## Brutalny Chaos — losowe efekty

Zmieniono działanie Brutalnego Chaosu:
- nie pokazuje już, które plansze zostaną zamienione,
- nie działa w stałej kolejności,
- za każdym razem losuje jeden z efektów:
  1. zamiana dwóch niepustych plansz,
  2. usunięcie jednego losowego symbolu,
  3. przerzucenie aktywnej planszy gracza na inną dostępną planszę.

Ostrzeżenie Brutalnego Chaosu pokazuje tylko, że nadchodzi efekt, ale nie zdradza szczegółów.
Cache PWA: `v18-brutal-random-chaos`.


## Wersja widoczna w aplikacji

Dodano widoczny numer wersji w prawym dolnym rogu aplikacji:

`v19-version-label`

Dzięki temu po deployu od razu widać, czy przeglądarka/PWA załadowała najnowszą wersję.
Cache PWA: `xo-online-pwa-v19-version-label`.


## Wersja aplikacji

Widoczna wersja w prawym dolnym rogu została ustawiona na:

`v0.9`

Plan wersjonowania:
- `v0.9` — aktualna wersja testowa,
- `v0.9.x` — kolejne poprawki testowe,
- `v1.0` — wersja gotowa/stabilna.


## v0.9.1 — aktualizacja instrukcji

Zaktualizowano pełną instrukcję PL/ENG:
- usunięto opis `Chaos sprawiedliwy`,
- opisano aktualne trzy warianty: ukryty, ostrzegany, brutalny,
- opisano losowe efekty Brutalnego Chaosu,
- dodano informację, że Brutalny Chaos nie pokazuje, które plansze ruszy,
- opisano przerzut aktywnej planszy,
- uporządkowano opis Pierwszej krwi i Nagłej śmierci.

Widoczna wersja aplikacji: `v0.9.1`.
Cache PWA: `xo-online-pwa-v0_9_1-rules-update`.
