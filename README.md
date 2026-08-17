# XO Chaos Online — v26 polished chaos

Pełna aplikacja Flask + Socket.IO + PWA.

Wersja w aplikacji:

```text
v26-polished-chaos
```

## Co zawiera

- papierowy wygląd menu głównego,
- ekran wygranej jako centralna nakładka na planszę w pokoju,
- widoczny licznik wygranych X/O podczas gry,
- nad planszą: Instrukcja, Link, Czat,
- pod planszą tylko Wróć do menu,
- poprawione karty Klasyczny / Studencki bez zasłaniania tekstu,
- poprawiony kafelek Zmieniaj zaczynającego,
- ustawienia uproszczone do języka PL / ENG,
- instrukcja segmentowa PL / ENG w modalu,
- nagrody dzienne jako +50 pkt za logowanie / kliknięcie,
- sklep z testowym przyciskiem +250 pkt do sprawdzania zakupów,
- znajomi przez link lokalnie,
- publiczne pokoje,
- czat w pokoju,
- punkty i statystyki w localStorage,
- bot: łatwy / normalny / trudny,
- poprawiony Chaos.

## Chaos

Chaos działa tylko w trybie Studenckim.

Warianty:

- Ukryty — bez ostrzeżenia, zamienia dwie niepuste i nieprzejęte plansze.
- Jawny — pokazuje ostrzeżenie, potem zamienia dwie niepuste i nieprzejęte plansze.
- Brutalny — działa częściej, losowo od 5 sekund do wybranej wartości: 5 / 10 / 15 / 20 / 30 s.

Brutalny chaos losuje efekt:

- zamiana dwóch plansz,
- usunięcie jednego symbolu,
- zmiana jednego symbolu X/O na przeciwny.

## Punkty

- punkty za wygrane są naliczane tylko online,
- lokalnie i z botem punkty za zwycięstwo nie są dodawane,
- bonus dzienny +50 pkt jest lokalny i służy do progresu/sklepu,
- sklep ma przycisk testowy +250 pkt tylko do testowania zakupów.

## Znajomi

Na tym etapie znajomi przez link działają lokalnie: link może dodać nazwę znajomego do lokalnej listy w przeglądarce. Prawdziwa lista znajomych między urządzeniami wymaga później bazy danych / kont użytkowników.

## Uruchomienie lokalne

```bash
pip install -r requirements.txt
python app.py
```

Adres lokalny:

```text
http://127.0.0.1:5000
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


# v27-target-visual

Pełna aplikacja z docelowym papierowym wyglądem menu inspirowanym wybraną grafiką.

Zmiany:
- nowe menu główne: logo po lewej, profil/punkty po prawej, duże karty Klasyczny/Studencki,
- przeprojektowane ustawienia chaosu: Ukryty / Jawny / Brutalny + interwał 5/10/15/20/30 s,
- poprawione karty, żeby grafiki nie zasłaniały tekstu,
- czytelne zasady specjalne i kafelek Zmieniaj zaczynającego,
- ustawienia języka PL/ENG w menu,
- +50 pkt za logowanie,
- przycisk + w profilu dodaje punkty testowe do sklepu,
- ekran wygranej zostaje wyświetlany centralnie na planszy w pokoju gry.


# v28-reference-visual

Poprawiono menu główne pod grafikę referencyjną: pełna szerokość telefonu, kompaktowy panel chaosu, brak poziomego rozjazdu, ukryte niższe przyciski techniczne z menu, dopracowany dolny pasek.


# v29-visual-fix

Poprawki względem v28:
- poprawiono ściśniętą górę menu,
- uproszczono pasek profilu/punktów, żeby nie łamał tekstu,
- poprawiono kafle „Zasady specjalne”, szczególnie ostatni kafel,
- przeniesiono interwał brutalnego chaosu do kompaktowego paska pod wariantami,
- dodano widoczny przycisk Instrukcja w menu,
- poprawiono przełączanie PL/ENG dla widocznych elementów menu,
- podbito cache/service worker i wersję do `v29-visual-fix`.


# v30-rooms-rematch

Zmiany:
- dodano przycisk `Pokoje` przy punktach/profilu u góry menu,
- usunięto dolny techniczny przycisk pokoi z głównego układu,
- dodano widoczny przycisk `Rewanż` w centralnym panelu wygranej/remisu,
- panel wygranej pozostaje na środku planszy.


## v31 rooms + quiet chaos

- Przycisk `Pokoje` jest widoczny przy profilu/punktach u góry menu.
- Komunikaty Chaosu nie pokazują już dużego czarnego toasta zasłaniającego planszę.
- Brutalny chaos: zamiana przejętych plansz jest możliwa tylko do momentu, gdy którykolwiek gracz ma 2 przejęte plansze. Później zamiana plansz działa tylko na nieprzejętych planszach, żeby Chaos nie ustawił losowo zwycięskiej linii.
- Wersja: `v31-rooms-quiet-chaos`.


## v32-rooms-button-visible

- Przeniesiono przycisk `Pokoje` nad kafel `+50 pkt za logowanie`.
- Usunięto `Pokoje` z ciasnego paska profilu/punktów u góry.
- Przygotowano pełną paczkę aplikacji z podbitym cache PWA.


## v33-chaos-selection-time

Zmiany:
- wyraźniejsze zaznaczenie aktualnie wybranego wariantu chaosu,
- nowy wybór maksymalnego czasu brutalnego chaosu: 15 s / 30 s / 45 s / 1 min,
- brutalny chaos losuje następne zdarzenie od 5 sekund do wybranego maksimum,
- podbite cache PWA i wersja aplikacji.


## v34-public-rooms-chaos-style

- Brutalny chaos ma jasny kafel jak pozostałe warianty; wybrany tryb pokazuje etykietę WYBRANY, mocną niebieską ramkę i radio.
- Czasy brutalnego chaosu pozostają: 15 s / 30 s / 45 s / 1 min. Efekt uruchamia się losowo od 5 sekund do wybranego maksimum.
- Każdy pokój tworzony w trybie Online jest publiczny automatycznie — nie ma checkboxa „Pokój publiczny”.
- Lista pokoi ma komunikat zgodny z nową zasadą: wystarczy utworzyć pokój Online.
- Kafel +50 pkt za logowanie jest bardziej kompaktowy.
- Brutalny chaos nadal losuje efekty: zamiana plansz, usunięcie symbolu albo zamiana jednego symbolu X/O na przeciwny.
