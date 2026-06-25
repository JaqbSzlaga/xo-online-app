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
