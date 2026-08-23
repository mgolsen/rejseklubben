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
    id: "baerenschloessle",
    name: "Bärenschlössle",
    area: "Rotwildpark · Stuttgart-West",
    address: "Mahdentalstraße 14, 70569 Stuttgart",
    lat: 48.7608643,
    lon: 9.0913685,
    icon: "🦌",
    accent: "#477b46",
    aspect: "Bedste udflugt",
    description: "Et kongeligt lystslot fra 1768 omgivet af skov, tre søer og vildtreservat. Biergarten-mad med mulighed for lokalt vildt og en ordentlig gåtur før øllen.",
    facts: ["Søudsigt", "Skov og hjorte", "Historie fra 1768"],
    sourceUrl: "https://www.baerenschloessle-stuttgart.de/de/",
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
    name: "Biergarten Max-Eyth-See",
    area: "Hofen · Stuttgart-Mühlhausen",
    address: "Mühlhäuser Straße 271, 70378 Stuttgart",
    lat: 48.8348144,
    lon: 9.214442,
    icon: "🏖️",
    accent: "#2f8eb2",
    aspect: "Mest ferieagtig",
    description: "En halvø ved søen med sandstrand, liggestole og hængekøjer. Fish & chips, burgere og fadøl gør det til Stuttgarts svar på en meget lille badeferie.",
    facts: ["Direkte ved vandet", "Sand og hængekøjer", "Fish & chips"],
    sourceUrl: "https://www.stuttgart-tourist.de/en/a-biergarten-max-eyth-see",
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

  card.append(top, aspect, name, area, description, chips, address, actions);
  return card;
}

function renderGardenGrid(gardens = beerGardens) {
  const fragment = document.createDocumentFragment();
  gardens.forEach((garden, index) => fragment.append(makeGardenCard(garden, index)));
  elements.gardenGrid.replaceChildren(fragment);
}

function renderNearest(rankedGardens, accuracy) {
  const [nearest, ...alternatives] = rankedGardens;
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
    return "Placering blev ikke tilladt. Du kan stadig se alle ti steder nedenfor og åbne deres ruter manuelt.";
  }
  if (error?.code === 2) {
    return "Telefonen kunne ikke bestemme placeringen. Prøv igen udenfor eller slå GPS til i telefonens indstillinger.";
  }
  if (error?.code === 3) {
    return "GPS-søgningen tog for lang tid. Prøv igen—gerne tættere på et vindue eller udenfor.";
  }
  return "Placeringen kunne ikke hentes. Alle ti biergartens kan stadig bruges nedenfor.";
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
