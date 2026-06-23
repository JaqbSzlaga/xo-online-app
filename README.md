# XO Chaos Online — v29.1-stable

To jest stabilny rebuild po problemach z mostkami/patchami.

## Zasada tej wersji

Nie ma:
- `app-paper-template.js`
- `xo-extensions.js`
- `bot-v27-bridge.js`
- `public-v28-bridge.js`
- `match-chat-v29-bridge.js`
- `final-v30-bridge.js`

Jest jeden frontend:

```text
static/game.js
```

Jest jeden styl:

```text
static/style.css
```

Backend:

```text
app.py
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

Python:

```text
3.11.9
```

Po uploadzie na GitHub:
Render -> Manual Deploy -> Clear build cache & deploy.
