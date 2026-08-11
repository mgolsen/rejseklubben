# Rejseklubben · Stuttgart 2026

En lille statisk hjemmeside til turen med et fælles stregregnskab baseret på tillid.

- `index.html` er turens forside.
- `streger.html` og `streger.js` er spillets brugerflade.
- `supabase/no-login-setup.sql` opretter den enkle database.
- `images/` indeholder sidens billeder.

Der er ingen build-proces, website-builder eller deltagerkonti. Siden kan udgives direkte med GitHub Pages.

## Sådan virker spillet

1. Når siden åbnes første gang, trykker man på sit navn.
2. Telefonen husker valget; **Skift person** gør det muligt at vælge igen.
3. En deltager foreslår en streg til en anden og beskriver hændelsen.
4. Hverken den valgte forslagsstiller eller den anklagede kan godkende forslaget.
5. En tredje valgt deltager skal godkende, før stregen tæller.
6. Stillingen beregnes automatisk ud fra godkendte streger.

Der er ingen egentlig identitetskontrol. En person kan bevidst trykke på en andens navn, så systemet bygger på samme tillid som et fysisk stregregnskab.

## Supabase-opsætning

Projektet bruger den forenklede opsætning uden login.

1. Åbn Supabase-projektet.
2. Vælg **SQL Editor → New query**.
3. Kopiér hele `supabase/no-login-setup.sql` ind i editoren.
4. Klik **Run**.
5. Der skal stå **Success. No rows returned**.

Scriptet tilføjer tre deltagere: Emil, Martin og Morten. Tabellerne fra den tidligere login-opsætning bliver stående i dit nuværende Supabase-projekt, men de bruges ikke af hjemmesiden og kan ignoreres.

### Tilføj eller ret deltagere

Åbn **Table Editor → players** i Supabase.

- Tilføj en person med **Insert → Insert row** og udfyld kun `display_name`.
- Ret et navn ved at klikke i feltet `display_name`.
- Fjern en person fra vælgeren ved at sætte `is_active` til `false`.

Supabase genererer automatisk id og tidspunkt.

## Spilleregler og sikkerhed

Databasefunktionerne kontrollerer, at:

- forslagsstiller og modtager er forskellige;
- godkenderen hverken er forslagsstiller eller modtager;
- et forslag kun kan godkendes én gang;
- kun forslagsstilleren kan trække et ventende forslag tilbage.

Tabellerne kan ikke ændres direkte fra browseren. Der er dog ingen loginbeskyttelse: alle med sidens adresse kan læse regnskabet og vælge et deltagernavn. `streger.html` er markeret `noindex`, så søgemaskiner bliver bedt om ikke at indeksere den.

## Supabase-forbindelsen

Frontend-koden bruger projektets browser-sikre URL og publishable key i `streger.js`. En `sb_secret_...`- eller `service_role`-nøgle må aldrig tilføjes til repositoryet eller browserkoden.

## Lokal visning

Start en lille lokal webserver:

```bash
python3 -m http.server 8000
```

Åbn derefter `http://localhost:8000/`.

## Redigering af turens indhold

- **Tagline:** søg efter `Mere hestekraft end fornuft` i `index.html`.
- **Holdet:** søg efter `HOLDET` og redigér kortene.
- **Datoer/nedtælling:** søg efter `2026-09-03` og `3.–6.`.
- **Fotos:** udskift filerne i `images/`, gerne med egne billeder.

## Udgivelse med GitHub Pages

1. Push filerne til `main`.
2. Gå til repositoryets **Settings → Pages**.
3. Vælg `main` og `/ (root)` som kilde.
4. Aktivér HTTPS.

Et subdomæne som `rejseklubben.morten-olsen.com` kan senere peges på GitHub Pages uden at flytte databasen.
