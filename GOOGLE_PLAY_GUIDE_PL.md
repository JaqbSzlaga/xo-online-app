# Jak wrzucić XO Chaos do Google Play i zarabiać

## Najprostsza ścieżka

Ta aplikacja jest webowa/PWA, więc do Google Play musisz ją opakować jako aplikację Android.

Najprostsze opcje:
1. Trusted Web Activity / Bubblewrap — aplikacja Android otwierająca Twoją stronę PWA.
2. Capacitor — wrapper Android dla aplikacji webowej.
3. Pełne przepisanie na natywne Android/Kotlin — najwięcej pracy.

Najbardziej sensownie na start:
- zostawić backend na Renderze,
- mieć domenę HTTPS,
- zrobić PWA,
- opakować PWA przez TWA/Bubblewrap albo Capacitor,
- wygenerować Android App Bundle `.aab`,
- wrzucić do Google Play Console.

## Czy można zarabiać za pobrania?

Tak, możesz ustawić aplikację jako płatną w Google Play, ale:
- musisz mieć konto dewelopera Google Play,
- musisz skonfigurować profil płatności/merchant,
- Google pobiera opłaty/udział od sprzedaży,
- płatność za pobranie odbywa się przez Google Play.

## Alternatywa

Możesz też zrobić aplikację darmową i zarabiać przez:
- reklamy, np. AdMob,
- zakup premium / usunięcie reklam,
- płatne dodatki przez Google Play Billing.

Do wersji z reklamami albo zakupami w aplikacji trzeba dodać zgodność z Google Play Billing / politykami reklam.

## Co przygotować do Play Console

- Konto Google Play Console.
- Podpisany Android App Bundle `.aab`.
- Nazwa aplikacji.
- Krótki i długi opis.
- Ikona 512×512.
- Feature graphic 1024×500.
- Screenshoty telefonu.
- Polityka prywatności, szczególnie jeśli online, logi, reklamy albo analityka.
- Klasyfikacja treści.
- Formularz bezpieczeństwa danych.
- Testy wewnętrzne/zamknięte, jeśli konto tego wymaga.

## Ważna uwaga

Jeśli aplikacja ma publiczne pokoje online albo czat, trzeba pilnować moderacji i bezpieczeństwa. Ta wersja clean nie pokazuje czatu, co ułatwia publikację.
