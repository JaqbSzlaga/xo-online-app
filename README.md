# XO Chaos Online — v25 complete paper game

Pełna paczka aplikacji Flask + Socket.IO + PWA.

## Wersja

`v25-complete-paper-game`

## Co jest w środku

- papierowy wygląd menu i ekranów dodatkowych,
- Classic i Studencki,
- Online / Lokalnie / Bot,
- bot w Classic i Studenckim,
- poziomy bota: łatwy / normalny / trudny,
- Chaos tylko w Studenckim: ukryty / jawny / brutalny,
- Pierwsza krew,
- Nagła śmierć 5 / 10 / 15 s,
- ostatni ruch świeci automatycznie cały czas,
- nad planszą: Instrukcja / Link / Czat,
- pod planszą: tylko Wróć do menu,
- segmentowa instrukcja w modalu,
- czat w pokoju z badge nowych wiadomości i bez duplikatów,
- publiczne pokoje: checkbox, nazwa pokoju, lista 1/2, dołączanie z listy,
- profil gracza w localStorage,
- lokalne statystyki,
- punkty gracza naliczane tylko za wygrane online,
- deduplikacja naliczania punktów za tę samą rundę,
- ranking lokalny i ekran online przygotowany wizualnie,
- znajomi / zapraszanie linkiem,
- nagrody / odznaki / dzienne naklejki bez punktów,
- sklep: motywy, skórki X/O, efekty wygranej,
- brak testowego przycisku typu `+250 TEST`,
- PWA: manifest, service worker, ikony.

## Ważne zasady punktów

Punkty można zdobywać tylko za wygrane online.

Nie dodajemy punktów za:

- lokalną grę,
- grę z botem,
- podgląd sklepu,
- dzienne nagrody,
- testy efektów.

## Render

Build Command:

```bash
pip install -r requirements.txt
```

Start Command:

```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
```

Python:

```text
3.11.9
```

## Lokalnie

```bash
pip install -r requirements.txt
python app.py
```

Adres:

```text
http://127.0.0.1:5000
```
