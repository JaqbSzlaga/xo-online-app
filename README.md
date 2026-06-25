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
