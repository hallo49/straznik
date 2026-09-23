# Strażnik — wersja publiczna (bez logowania)

Publiczna strona internetowa dla seniorów: wgraj zdjęcie/zrzut ekranu albo
wklej treść podejrzanej wiadomości, a appka oceni, czy to bezpieczne, warto
uważać, czy to prawdopodobnie oszustwo (np. "na wnuczka", phishing,
wyłudzenie danych). Nikt nie musi zakładać konta — koszt zapytań do AI
ponosicie Wy, przez własny klucz API.

To dokładnie ten sam proces wdrożenia co przy poprzednim narzędziu
(Skaner Prawdy) — jeśli już przez to przechodziłaś, kroki poniżej
będą znajome.

## Jak to jest zbudowane

- `public/index.html` — cała strona (frontend), jeden plik, duże czcionki,
  bez zależności
- `api/analyze.js` — funkcja serwerowa, która trzyma klucz API i woła
  Anthropic API. Klucz nigdy nie trafia do przeglądarki użytkownika.
- Hosting: **Vercel** (darmowy plan wystarczy na start)

## Wdrożenie krok po kroku

### 1. Klucz API Anthropic
Jeśli masz już klucz z poprzedniego projektu (Skaner Prawdy) — możesz użyć
tego samego, nie trzeba tworzyć nowego. Jeśli chcesz osobny klucz dla tej
appki (np. żeby osobno śledzić koszty każdej appki w Anthropic Console):
1. Wejdź na [console.anthropic.com](https://console.anthropic.com)
2. W sekcji **API Keys** kliknij **"Create Key"**, nadaj nazwę (np. "straznik")
3. Skopiuj klucz od razu — nie da się go zobaczyć drugi raz

### 2. GitHub — nowe repozytorium
1. Wejdź na **github.com**, kliknij **"New"**
2. Nazwij repo np. `straznik`, kliknij **"Create repository"**
3. Na stronie repo kliknij **"uploading an existing file"**
4. Przeciągnij do przeglądarki: folder `public`, folder `api`, plik
   `package.json`
5. Kliknij **"Commit changes"**

### 3. Vercel — import i wdrożenie
1. Na vercel.com kliknij **"Add New… → Project"** (albo "Import your Project")
2. Wybierz **GitHub**, znajdź repo `straznik`, kliknij **"Import"**
3. Rozwiń **"Environment Variables"**, dodaj:
   - Name: `ANTHROPIC_API_KEY`
   - Value: klucz z kroku 1
4. Kliknij **"Deploy"**
5. Po chwili dostaniesz publiczny adres typu `straznik.vercel.app`

### 4. Kredyty na koncie Anthropic
Appka nie zadziała, dopóki na koncie Anthropic nie ma choć trochę środków —
sprawdź na **console.anthropic.com → Add funds**, jeśli korzystasz z
nowego, osobnego klucza. Jeśli używasz tego samego klucza co w Skanerze
Prawdy, konto ma już te same środki — nic dodatkowego nie trzeba robić.

## Koszty

- **Vercel**: darmowy plan (Hobby) — wystarczy na start i testy
- **Anthropic API**: płatne za zapytanie, ułamek centa do pojedynczych
  centów za jedną analizę — realny koszt warto oszacować przy większym
  ruchu i wpisać do budżetu grantu jako "koszty infrastruktury / API"

## Bezpieczeństwo — ZANIM zrobicie duży launch

Tak jak przy Skanerze Prawdy: w kodzie jest tylko podstawowy limit
8 zapytań na minutę z jednego adresu IP — wystarczający na testy, ale
niewystarczający na duży ruch (np. po publikacji w Google Play albo
kampanii medialnej). Przed szerszą promocją warto dodać:
- **Cloudflare Turnstile** przed wysłaniem zapytania
- globalny dzienny limit liczby zapytań
- monitoring wydatków w konsoli Anthropic (alert e-mailowy)

## Krok dalej: appka na Google Play

Gdy strona już działa publicznie i jest przetestowana, można ją
"opakować" w appkę na Androida przez **PWABuilder** (pwabuilder.com) —
wklejasz link do strony (np. `straznik.vercel.app`), narzędzie generuje
gotowy plik do wgrania na Google Play. Wymaga też konta Google Play
Console (jednorazowa opłata 25 USD) i prostej polityki prywatności.
