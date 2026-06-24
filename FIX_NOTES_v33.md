# XO v33.0 student/bot fix

Naprawa oparta na aktualnym kodzie z GitHuba.

Najważniejsze zmiany:
- menu papierowe synchronizuje kliknięty tryb (`online/local/bot`) i wersję (`classic/student`) bezpośrednio przed tworzeniem pokoju;
- `create_room` nie opiera się już wyłącznie na ukrytym selectcie, który potrafił zostać w wartości `online`;
- usunięto `student-v30-3-fix.js`, bo nadpisywał klasy plansz Studenckiego i mógł rozjeżdżać stan wizualny;
- local/bot nie pokazują symbolu O jako rozłączonego;
- dodano stabilizację CSS planszy Studenckiej na mobile;
- podbito cache/service worker do v33.
