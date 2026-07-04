# Ostatnie Oko

Korektor ortotypograficzny polskich tekstów literackich — ostatnia para oczu przed drukiem.

Aplikacja działa **w całości w przeglądarce**: bez modelu językowego, bez API, bez serwera. Tekst nigdy nie opuszcza komputera. Wyłącznie deterministyczne reguły w JavaScript, uruchamiane w Web Workerze (płynnie obsługuje całą powieść, do ok. 1,5 mln znaków).

## Co sprawdza

- **A** — spacje i znaki niewidzialne (wielokrotne spacje, tabulatory, twarde spacje, spacje przy interpunkcji i nawiasach)
- **B** — cudzysłowy i apostrofy (zgodność z konwencją, sparowanie, apostrof typograficzny)
- **C** — kreski: dywiz / półpauza / pauza (wtrącenia, zakresy liczb, mieszanie kresek)
- **D** — zapis dialogów (polska konwencja pauzy dialogowej, didaskalia, kontynuacje wypowiedzi)
- **E** — wielokropek
- **F** — powtórzenia i zdublowania
- **G** — konsekwencja nazw własnych (Katarzyna/Katażyna, Rynek/rynek)
- **H** — skróty i zapis edytorski (np., 1737 r., 5 km, J. Kowalski)
- **I** — heurystyki przecinkowe (tylko sugestie, nigdy autopoprawka)

Przed skanem aplikacja wykrywa **kartę konwencji** tekstu (cudzysłów, kreska dialogowa, wielokropek, zapis wtrąceń) i zgłasza odstępstwa względem niej — nie względem jednej sztywnej normy.

## Jak uruchomić

Najprościej: otwórz `index.html` w przeglądarce (dwuklik). Do wczytywania plików `.docx` potrzebny jest internet przy pierwszym otwarciu (biblioteka mammoth.js z CDN); pliki `.txt` i wklejanie działają zawsze.

## Wdrożenie na GitHub Pages

1. Załóż nowe repozytorium na GitHub (np. `ostatnie-oko`).
2. Wgraj do niego pliki: `index.html`, `app.js`, `rules.js`, `style.css`.
3. W repozytorium: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save**.
4. Po chwili aplikacja będzie dostępna pod adresem `https://twoja-nazwa.github.io/ostatnie-oko/`.

## Tryb testowy (samokontrola)

Dodaj `?test=1` do adresu (np. `index.html?test=1`) — uruchomi się wbudowany zestaw 51 zdań testowych (w tym zdania-pułapki, których nie wolno oflagować) i pokaże tabelę reguła / oczekiwane / wykryte / OK-FAIL.

## Uczciwość

Ostatnie Oko sprawdza mechanikę zapisu. Nie widzi literówek zmieniających znaczenie (morze/może), błędnej odmiany ani stylu — te warstwy wymagają korekty rozumiejącej tekst.
