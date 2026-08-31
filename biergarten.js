const beerGardens = [
  {
    id: "schlossgarten",
    name: "Biergarten im Schlossgarten",
    area: "Stuttgart-Mitte",
    address: "Am Schlossgarten 18, 70173 Stuttgart",
    lat: 48.7846319,
    lon: 9.1862028,
    icon: "🌳",
    accent: "#e1a61c",
    aspect: "Bedst placeret",
    description: "Frisk fadøl og schwabiske klassikere midt i byens grønne hjerte. Det oplagte samlingssted, når ingen vil bruge en halv time på transport.",
    facts: ["Midt i centrum", "Regional mad", "10 % StuttCard-rabat i sæsonen"],
    sourceUrl: "https://www.biergarten-schlossgarten.de/",
  },
  {
    id: "karlshoehe",
    name: "Tschechen & Söhne",
    area: "Karlshöhe · Stuttgart-Süd",
    address: "Humboldtstraße 44, 70178 Stuttgart",
    lat: 48.7679917,
    lon: 9.1654279,
    icon: "🌇",
    accent: "#da6f32",
    aspect: "Bedste panorama",
    description: "Biergarten på toppen af Karlshöhe med udsigt over bygryden og vinmarkerne. Gå efter solnedgangen, udsigten og Dinkelacker fra stentøjskruset.",
    facts: ["Panoramaudsigt", "Historisk 1961-pavillon", "Schwabiske retter"],
    sourceUrl: "https://biergarten-karlshoehe.com/",
  },
  {
    id: "teehaus",
    name: "Teehaus im Weißenburgpark",
    area: "Weißenburgpark · Stuttgart-Süd",
    address: "Hohenheimer Straße 119, 70184 Stuttgart",
    lat: 48.764431,
    lon: 9.182807,
    icon: "🏛️",
    accent: "#8b5e75",
    aspect: "Mest elegant",
    description: "En fredet Jugendstil-pavillon fra 1913 med stor terrasse, springvand, lille dam og udsigt over bygryden. Regional fadøl i omgivelser, der føles mere som havefest end ølhal.",
    facts: ["Jugendstil fra 1913", "Ca. 200 terrassepladser", "Dam, springvand og byudsigt"],
    sourceUrl: "https://www.teehaus-stuttgart.de/",
  },
  {
    id: "augustiner",
    name: "Augustiner Biergarten",
    area: "Kursaal · Bad Cannstatt",
    address: "Königsplatz 1, 70372 Stuttgart",
    lat: 48.8084207,
    lon: 9.2236088,
    icon: "🍺",
    accent: "#c83d2f",
    aspect: "Bedste ølhistorie",
    description: "Baden-Württembergs første og eneste Augustiner-biergarten. Der har været Kursaal-biergarten siden omkring 1880—på grunden hvor Daimler og Maybach arbejdede med den tidlige motor.",
    facts: ["Augustiner fra München", "Historie siden ca. 1880", "En af byens største"],
    sourceUrl: "https://www.augustiner-biergarten-stuttgart.de/home/",
  },
  {
    id: "schweinemuseum",
    name: "SchweineMuseum Biergarten",
    area: "Gaisburg · Stuttgart-Ost",
    address: "Schlachthofstraße 2, 70188 Stuttgart",
    lat: 48.7857425,
    lon: 9.2198477,
    icon: "🐷",
    accent: "#df6687",
    aspect: "Mest vidunderligt mærkelig",
    description: "Omkring 600 pladser ved verdens største grisemuseum med over 50.000 udstillingsgenstande. Jugendstil, svinekunst og svineskank: konceptet er kompromisløst.",
    facts: ["Ca. 600 pladser", "Verdens største grisemuseum", "Tidligere slagteri"],
    sourceUrl: "https://www.schweinemuseum.de/",
  },
  {
    id: "max-eyth-see",
    name: "Dock Snyder · Max-Eyth-See",
    area: "Hofen · Stuttgart-Mühlhausen",
    address: "Mühlhäuser Straße 271, 70376 Stuttgart",
    lat: 48.8348144,
    lon: 9.214442,
    icon: "🏖️",
    accent: "#2f8eb2",
    aspect: "Mest ferieagtig",
    description: "En halvø ved søen med sandstrand, liggestole og hængekøjer. Fish & chips, burgere og fadøl gør det til Stuttgarts svar på en meget lille badeferie.",
    facts: ["Direkte ved vandet", "Sand og hængekøjer", "Fish & chips"],
    sourceUrl: "https://docksnyder.de/",
  },
  {
    id: "hasenstall",
    name: "Hasenstall",
    area: "Sillenbuch",
    address: "Steingrube, Gewann 12, 70619 Stuttgart",
    lat: 48.745,
    lon: 9.21243,
    icon: "🐇",
    accent: "#9b6b3b",
    aspect: "Bedste retro-charme",
    description: "Kaninavlerforening møder campingferie hos bedstemor. Under kastanjetræerne serveres jordnære schwabiske retter og øl i et miljø, der nægter at være smart.",
    facts: ["Foreningshus", "Retro-stemning", "Hjemmelavet schwabisk mad"],
    sourceUrl: "https://www.restaurant-hasenstall.de/",
  },
  {
    id: "garbe",
    name: "Wirtshaus Garbe",
    area: "Plieningen",
    address: "Filderhauptstraße 136, 70599 Stuttgart",
    lat: 48.7107862,
    lon: 9.2035518,
    icon: "🔥",
    accent: "#b9572e",
    aspect: "Bedste biergarten-mad",
    description: "En sydlig Stuttgart-institution, hvor moderne schwabisk køkken møder gamle træer. Den hjemmelavede Dinnete fra træovnen er stedets stærkeste argument.",
    facts: ["Dinnete fra træovn", "Lokale råvarer", "Gamle skyggetræer"],
    sourceUrl: "https://www.wirtshausgarbe.de/",
  },
  {
    id: "ins-blaue",
    name: "Ins Blaue",
    area: "Wartberg · Stuttgart-Nord",
    address: "Wartbergstraße 40, 70191 Stuttgart",
    lat: 48.8049069,
    lon: 9.1775248,
    icon: "🪴",
    accent: "#4789a4",
    aspect: "Bedste hemmelige have",
    description: "Et grønt frikvarter ved foden af Killesberg med kolonihavecharme, små søer og økostation. Trafikstøj føles meget langt væk, selv om centrum ikke er det.",
    facts: ["Skjult i det grønne", "Små søer", "Ved Killesberg"],
    sourceUrl: "https://www.stuttgart-tourist.de/en/a-ins-blaue",
  },
  {
    id: "flora-fauna",
    name: "Flora & Fauna",
    area: "Rosensteinpark · Stuttgart-Ost",
    address: "Am Schwanenplatz 10, 70190 Stuttgart",
    lat: 48.7968458,
    lon: 9.2051088,
    icon: "🥙",
    accent: "#6c994a",
    aspect: "Bedst til hele flokken",
    description: "Parkkant efter Wilhelma eller en cykeltur, med en menu der spænder fra Käsespätzle til falafel, Flammkuchen og salater. Et stærkt kompromis for forskellige appetitter.",
    facts: ["Ved Rosensteinpark", "Vegetarvenlig", "Dagligt skiftende menu"],
    sourceUrl: "https://www.floraundfauna-stuttgart.de/",
  },
  {
    id: "carls",
    name: "Carls Brauhaus",
    area: "Schlossplatz · Stuttgart-Mitte",
    address: "Stauffenbergstraße 1, 70173 Stuttgart",
    lat: 48.7793589,
    lon: 9.1802132,
    icon: "🏰",
    accent: "#8f4e3a",
    aspect: "Bedste Schlossplatz-udsigt",
    description: "Et stort schwabisk brauhaus direkte ved Schlossplatz med Dinkelacker-Schwaben Bräu på hanerne. Carl Dinkelacker grundlagde et bryggeri på stedet i 1888; det nuværende Carls åbnede i 2014.",
    facts: ["Direkte ved Schlossplatz", "Dinkelacker-Schwaben Bräu", "Grupper bør reservere"],
    sourceUrl: "https://www.carls-brauhaus.de/",
  },
  {
    id: "nesenbach",
    name: "Nesenbach Wirtshaus",
    area: "Dorotheen Quartier · Stuttgart-Mitte",
    address: "Dorotheenstraße 6, 70173 Stuttgart",
    lat: 48.7760823,
    lon: 9.1801838,
    icon: "🥨",
    accent: "#b7762d",
    aspect: "Mest centralt til en fest",
    description: "Moderne schwabisk-bayersk wirtshaus med biergarten ved Altes Schloss og Karlsplatz. Her er nyfortolkede klassikere, Augustiner på fad og plads til en stor flok.",
    facts: ["Ved Altes Schloss", "Augustiner på fad", "Op til 90 i biergarten"],
    sourceUrl: "https://www.nesenbach-stuttgart.de/home/",
  },
  {
    id: "sophies",
    name: "Sophie's Brauhaus",
    area: "Marienstraße · Stuttgart-Mitte",
    address: "Marienstraße 28, 70178 Stuttgart",
    lat: 48.7728829,
    lon: 9.172417,
    icon: "⚗️",
    accent: "#b85f28",
    aspect: "Bedste husbryggede øl",
    description: "Et livligt mikrobryggeri, hvor øllet brygges på stedet, og kobberkedlerne står synligt bag baren. Udvalget omfatter blandt andet lyst hvedeøl, sort øl og sæsonbryg.",
    facts: ["Brygges på stedet", "Kobberkedler ved baren", "Grupper fra 10: forespørg"],
    sourceUrl: "https://sophies-brauhaus.de/",
  },
];

const elements = {
  findButton: document.querySelector("#find-nearest"),
  locationStatus: document.querySelector("#location-status"),
  nearestSection: document.querySelector("#nearest-section"),
  nearestIcon: document.querySelector("#nearest-icon"),
  nearestName: document.querySelector("#nearest-name"),
  nearestAspect: document.querySelector("#nearest-aspect"),
  nearestDistance: document.querySelector("#nearest-distance"),
  nearestDescription: document.querySelector("#nearest-description"),
  nearestAddress: document.querySelector("#nearest-address"),
  nearestRoute: document.querySelector("#nearest-route"),
  nearestSource: document.querySelector("#nearest-source"),
  runnerGrid: document.querySelector("#runner-grid"),
  gardenGrid: document.querySelector("#garden-grid"),
  sortState: document.querySelector("#sort-state"),
};

const toRadians = (degrees) => degrees * Math.PI / 180;

function distanceInKilometres(fromLat, fromLon, toLat, toLon) {
  const earthRadius = 6371;
  const latitudeDifference = toRadians(toLat - fromLat);
  const longitudeDifference = toRadians(toLon - fromLon);
  const startLatitude = toRadians(fromLat);
  const endLatitude = toRadians(toLat);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude)
      * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(kilometres) {
  if (kilometres < 1) {
    const metres = Math.max(10, Math.round(kilometres * 100));
    return `${metres * 10} m`;
  }
  return `${kilometres.toLocaleString("da-DK", {
    minimumFractionDigits: kilometres < 10 ? 1 : 0,
    maximumFractionDigits: kilometres < 10 ? 1 : 0,
  })} km`;
}

function routeUrl(garden) {
  const destination = encodeURIComponent(`${garden.lat},${garden.lon}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

function makeButton(label, href, secondary = false) {
  const link = document.createElement("a");
  link.className = `button${secondary ? " secondary" : ""}`;
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  return link;
}

function makeGardenCard(garden, index) {
  const card = document.createElement("article");
  card.className = "garden-card";
  card.dataset.icon = garden.icon;
  card.style.setProperty("--accent", garden.accent);

  const top = document.createElement("div");
  top.className = "card-top";

  const number = document.createElement("div");
  number.className = "card-number";
  number.textContent = String(index + 1).padStart(2, "0");
  top.append(number);

  if (Number.isFinite(garden.distance)) {
    const distance = document.createElement("span");
    distance.className = "distance-pill";
    distance.textContent = `${formatDistance(garden.distance)} væk`;
    top.append(distance);
  }

  const aspect = document.createElement("div");
  aspect.className = "aspect";
  aspect.textContent = `${garden.icon} ${garden.aspect}`;

  const name = document.createElement("h3");
  name.textContent = garden.name;

  const area = document.createElement("p");
  area.className = "area";
  area.textContent = garden.area;

  const description = document.createElement("p");
  description.className = "card-description";
  description.textContent = garden.description;

  const content = [top, aspect, name, area, description];

  if (garden.notice) {
    const notice = document.createElement("p");
    notice.className = "card-notice";
    notice.textContent = garden.notice;
    content.push(notice);
  }

  const chips = document.createElement("div");
  chips.className = "chips";
  garden.facts.forEach((fact) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = fact;
    chips.append(chip);
  });

  const address = document.createElement("p");
  address.className = "card-address";
  address.textContent = garden.address;

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    makeButton("Gårute ↗", routeUrl(garden)),
    makeButton("Officiel side ↗", garden.sourceUrl, true),
  );

  content.push(chips, address, actions);
  card.append(...content);
  return card;
}

function renderGardenGrid(gardens = beerGardens) {
  const fragment = document.createDocumentFragment();
  gardens.forEach((garden, index) => fragment.append(makeGardenCard(garden, index)));
  elements.gardenGrid.replaceChildren(fragment);
}

function renderNearest(rankedGardens, accuracy) {
  const availableGardens = rankedGardens.filter((garden) => garden.availableDuringTrip !== false);
  const [nearest, ...alternatives] = availableGardens;
  elements.nearestIcon.textContent = nearest.icon;
  elements.nearestName.textContent = nearest.name;
  elements.nearestAspect.textContent = nearest.aspect;
  elements.nearestDistance.textContent = formatDistance(nearest.distance);
  elements.nearestDescription.textContent = nearest.description;
  elements.nearestAddress.textContent = nearest.address;
  elements.nearestRoute.href = routeUrl(nearest);
  elements.nearestSource.href = nearest.sourceUrl;

  const runners = alternatives.slice(0, 2).map((garden) => {
    const runner = document.createElement("div");
    runner.className = "runner";

    const icon = document.createElement("span");
    icon.className = "runner-icon";
    icon.textContent = garden.icon;

    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = garden.name;
    const distance = document.createElement("span");
    distance.textContent = `${formatDistance(garden.distance)} væk · ${garden.aspect}`;
    copy.append(name, distance);
    runner.append(icon, copy);
    return runner;
  });
  elements.runnerGrid.replaceChildren(...runners);

  const roundedAccuracy = Math.max(5, Math.round(accuracy / 5) * 5);
  elements.locationStatus.textContent = `Position fundet med cirka ${roundedAccuracy} meters nøjagtighed. Afstandene er nu opdateret.`;
  elements.sortState.textContent = "Sorteret efter GPS-afstand";
  elements.nearestSection.hidden = false;
  renderGardenGrid(rankedGardens);
  elements.nearestSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function locationErrorMessage(error) {
  if (error?.code === 1) {
    return `Placering blev ikke tilladt. Du kan stadig se alle ${beerGardens.length} steder nedenfor og åbne deres ruter manuelt.`;
  }
  if (error?.code === 2) {
    return "Telefonen kunne ikke bestemme placeringen. Prøv igen udenfor eller slå GPS til i telefonens indstillinger.";
  }
  if (error?.code === 3) {
    return "GPS-søgningen tog for lang tid. Prøv igen—gerne tættere på et vindue eller udenfor.";
  }
  return `Placeringen kunne ikke hentes. Alle ${beerGardens.length} steder kan stadig ses nedenfor.`;
}

function findNearest() {
  if (!navigator.geolocation) {
    elements.locationStatus.textContent = "Denne browser understøtter ikke GPS. Brug listen og ruteknapperne nedenfor.";
    return;
  }

  elements.findButton.disabled = true;
  elements.findButton.querySelector("span:last-child").textContent = "Lytter efter satellitter…";
  elements.locationStatus.textContent = "Telefonen spørger nu om tilladelse til at bruge din position.";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const rankedGardens = beerGardens
        .map((garden) => ({
          ...garden,
          distance: distanceInKilometres(latitude, longitude, garden.lat, garden.lon),
        }))
        .sort((a, b) => a.distance - b.distance);

      renderNearest(rankedGardens, accuracy);
      elements.findButton.disabled = false;
      elements.findButton.querySelector("span:last-child").textContent = "Opdatér min position";
    },
    (error) => {
      elements.locationStatus.textContent = locationErrorMessage(error);
      elements.findButton.disabled = false;
      elements.findButton.querySelector("span:last-child").textContent = "Prøv GPS igen";
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    },
  );
}

elements.findButton.addEventListener("click", findNearest);
renderGardenGrid();
