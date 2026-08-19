# Rejseklubben · Stuttgart 2026

En lille statisk hjemmeside til turen med et fælles stregregnskab og personlige deltagerkoder.

- `index.html` er turens forside.
- `streger.html` og `streger.js` er spillets brugerflade.
- `supabase/no-login-setup.sql` opretter den enkle database.
- `supabase/add-personal-codes.sql` binder hver deltager til én browsersession.
- `supabase/add-trip-members.sql` tilføjer turens øvrige deltagere uden at nulstille eksisterende telefoner.
- `images/` indeholder sidens billeder.

Der er ingen synlige logins, e-mails eller adgangskoder. Supabase opretter automatisk en anonym session i baggrunden, og siden kan stadig udgives direkte med GitHub Pages.

## Sådan virker spillet

1. Når siden åbnes første gang, trykker man på sit navn og indtaster sin personlige tocifrede kode.
2. Browseren bliver bundet til deltageren. Man kan ikke skifte person fra hjemmesiden.
3. En deltager foreslår en streg til en anden og beskriver hændelsen.
4. Hverken den valgte forslagsstiller eller den anklagede kan godkende forslaget.
5. En tredje valgt deltager skal godkende, før stregen tæller.
6. Stillingen beregnes automatisk ud fra godkendte streger.

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

Scriptet tilføjer tre deltagere: Emil, Martin og Morten. Tabellerne fra den tidligere login-opsætning bliver stående i dit nuværende Supabase-projekt, men de bruges ikke af hjemmesiden og kan ignoreres.

Hvis `no-login-setup.sql` allerede er kørt, skal du kun udføre trin 6–8. Advarslen om destructive operations er forventet for migrationsscriptet: det fjerner adgangen til de gamle usikre skrivefunktioner og nulstiller eksisterende telefonbindinger, men sletter ikke deltagere eller streger.

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
- godkenderen hverken er forslagsstiller eller modtager;
- et forslag kun kan godkendes én gang;
- kun forslagsstilleren kan trække et ventende forslag tilbage.

Tabellerne kan ikke ændres direkte fra browseren. Kun en anonym session, som er bundet med den rigtige personlige kode, kan foreslå, godkende eller trække en streg tilbage. Fem forkerte kodeforsøg udløser 15 minutters pause. Alle med sidens adresse kan fortsat læse regnskabet og se deltagernavnene. `streger.html` er markeret `noindex`, så søgemaskiner bliver bedt om ikke at indeksere den.

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
