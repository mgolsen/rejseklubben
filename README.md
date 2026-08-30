# Rejseklubben · Stuttgart 2026

En lille statisk hjemmeside til turen med et fælles stregregnskab og personlige deltagerkoder.

- `index.html` er turens forside.
- `streger.html` og `streger.js` er spillets brugerflade.
- `biergarten.html` og `biergarten.js` er den GPS-baserede guide til ti håndplukkede biergartens.
- `supabase/no-login-setup.sql` opretter den enkle database.
- `supabase/add-personal-codes.sql` binder hver deltager til én browsersession.
- `supabase/add-streg-values.sql` gør hver hændelse 1, 2 eller 3 streger værd.
- `supabase/add-group-voting-and-pardons.sql` tilføjer afstemninger, tidsfrist, tilbageslag og benådninger.
- `supabase/add-logout.sql` gør telefonbindingen mulig at frigive fra hjemmesiden.
- `supabase/add-admin-access.sql` giver Emil, Martin og Morten beskyttet adgang til at rette regnskabet.
- `images/` indeholder sidens billeder.

Der er ingen synlige logins, e-mails eller adgangskoder. Supabase opretter automatisk en anonym session i baggrunden, og siden kan stadig udgives direkte med GitHub Pages.

## Sådan virker spillet

1. Når siden åbnes første gang, trykker man på sit navn og indtaster sin personlige tocifrede kode.
2. Browseren husker deltageren, indtil personen bruger **Log ud**. Derefter kan en anden deltager logge ind med sin egen kode.
3. En deltager foreslår 1, 2 eller 3 streger til en anden og beskriver hændelsen.
4. Klubben har to minutter til at stemme. 1, 2 og 3 streger kræver henholdsvis 2, 4 og 8 stemmer.
5. Hverken forslagsstilleren eller den anklagede kan stemme. Hver anden deltager kan kun stemme én gang.
6. Når en straf ikke får stemmer nok inden fristen, får forslagsstilleren selv det foreslåede antal streger.
7. En deltager kan foreslå en benådning af en anden. Den kræver 8 stemmer og fjerner 1 streg, men stillingen kan ikke blive negativ.
8. Emil, Martin og Morten kan tilføje eller fjerne 1–3 streger direkte med en begrundelse. Rettelsen bliver synlig i protokollen.
9. Stillingen beregnes automatisk ud fra vedtagne straffe, tilbageslag, benådninger og administratorrettelser.

Databasefunktionerne bruger den bundne Supabase-session som identitet. Browseren kan derfor ikke udgive sig for at være en anden deltager ved blot at ændre et navn eller et id i frontend-koden.

## Supabase-opsætning

Ved en helt ny opsætning:

1. Åbn Supabase-projektet.
2. Vælg **SQL Editor → New query**.
3. Kopiér hele `supabase/no-login-setup.sql` ind i editoren.
4. Klik **Run**.
5. Der skal stå **Success. No rows returned**.
6. Gå til **Authentication → Sign In / Providers → Anonymous** og slå anonyme logins til.
7. Kør derefter hele `supabase/add-personal-codes.sql` i en ny SQL Editor-fane.
8. Resultatet viser én personlig kode pr. deltager. Gem listen privat med det samme; databasen gemmer kun kodernes hashes.
9. Kør derefter `supabase/add-group-voting-and-pardons.sql`, `supabase/add-logout.sql` og `supabase/add-admin-access.sql` i hver sin nye SQL Editor-fane.

Scriptet tilføjer tre deltagere: Emil, Martin og Morten. Tabellerne fra den tidligere login-opsætning bliver stående i dit nuværende Supabase-projekt, men de bruges ikke af hjemmesiden og kan ignoreres.

Hvis `no-login-setup.sql` allerede er kørt, skal du kun udføre trin 6–9. Advarslen om destructive operations er forventet for migrationsscripterne: de beskytter skrivefunktionerne og udvider regnskabet, men sletter ikke deltagere eller streger.

### Tilføj eller ret deltagere

Åbn **Table Editor → players** i Supabase for at rette eksisterende deltagere.

- Ret et navn ved at klikke i feltet `display_name`.
- Fjern en person fra vælgeren ved at sætte `is_active` til `false`.

En ny deltager skal både oprettes og have en kode. Kør dette i SQL Editor med det ønskede navn og en privat tocifret kode:

```sql
insert into public.players (display_name, claim_code_hash)
values (
  'Nyt navn',
  extensions.crypt('42', extensions.gen_salt('bf', 10))
);
```

Udskift naturligvis `Nyt navn` og `42` før kommandoen køres.

### Ny telefon eller glemt kode

Ved et normalt telefonskift logger deltageren ud på den gamle telefon og ind på den nye med sin eksisterende kode.

En arrangør kan nulstille én deltager og samtidig vælge en ny kode. Det afkobler den gamle browser:

```sql
update public.players
set
  claim_code_hash = extensions.crypt('73', extensions.gen_salt('bf', 10)),
  claimed_user_id = null,
  claimed_at = null
where display_name = 'Deltagerens navn';
```

Udskift koden og navnet. Deltageren kan derefter binde den nye telefon fra hjemmesiden.

## Spilleregler og sikkerhed

Databasefunktionerne kontrollerer, at:

- forslagsstiller og modtager er forskellige;
- en stemme hverken kommer fra forslagsstilleren eller modtageren;
- hver deltager kun kan stemme én gang på samme forslag;
- stemmer kun modtages inden for de to minutter;
- tærsklerne 2, 4 og 8 håndhæves i databasen;
- kun forslagsstilleren kan trække et åbent forslag tilbage, og kun før den første stemme.
- kun de tre markerede administratorer kan foretage en direkte rettelse;
- en administratorrettelse kræver en begrundelse, gemmer administratorens identitet og kan ikke gøre en score negativ.

Tabellerne kan ikke ændres direkte fra browseren. Kun en anonym session, som er bundet med den rigtige personlige kode, kan foreslå, stemme eller trække et forslag tilbage. Fem forkerte kodeforsøg udløser 15 minutters pause. Alle med sidens adresse kan fortsat læse regnskabet og se deltagernavnene. `streger.html` er markeret `noindex`, så søgemaskiner bliver bedt om ikke at indeksere den.

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
