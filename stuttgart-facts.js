(function () {
  "use strict";

  var facts = Array.isArray(window.STUTTGART_FACTS) ? window.STUTTGART_FACTS : [];
  var expectedFactCount = 130;
  var storageKey = "rejseklubben-stuttgart-fact-deck-v2";
  var currentFact = null;
  var deck = loadDeck();
  var changing = false;

  var card = document.getElementById("fact-card");
  var category = document.getElementById("fact-category");
  var number = document.getElementById("fact-number");
  var text = document.getElementById("fact-text");
  var source = document.getElementById("fact-source");
  var progress = document.getElementById("fact-progress");
  var nextButton = document.getElementById("next-fact");
  var shareButton = document.getElementById("share-fact");

  function secureRandomIndex(length) {
    if (window.crypto && window.crypto.getRandomValues) {
      var range = 4294967296;
      var limit = range - (range % length);
      var values = new Uint32Array(1);
      do { window.crypto.getRandomValues(values); } while (values[0] >= limit);
      return values[0] % length;
    }
    return Math.floor(Math.random() * length);
  }

  function shuffledIds() {
    var ids = facts.map(function (fact) { return fact.id; });
    for (var index = ids.length - 1; index > 0; index -= 1) {
      var swapIndex = secureRandomIndex(index + 1);
      var temporary = ids[index];
      ids[index] = ids[swapIndex];
      ids[swapIndex] = temporary;
    }
    return ids;
  }

  function loadDeck() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(storageKey));
      if (Array.isArray(saved) && saved.length && saved.every(function (id) {
        return facts.some(function (fact) { return fact.id === id; });
      })) return saved;
    } catch (error) {
      // The archive still works if private browsing blocks session storage.
    }
    return shuffledIds();
  }

  function saveDeck() {
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(deck)); }
    catch (error) { /* Persistence is optional. */ }
  }

  function renderFact(fact) {
    currentFact = fact;
    card.classList.toggle("long-fact", fact.text.length > 175);
    card.classList.toggle("very-long-fact", fact.text.length > 245);
    category.textContent = fact.category;
    number.textContent = "#" + String(fact.id).padStart(3, "0");
    text.textContent = fact.text;
    source.textContent = fact.sourceLabel + " ↗";
    source.href = fact.sourceUrl;
    var shown = facts.length - deck.length;
    progress.textContent = shown + " af " + facts.length + " facts set i denne bunke";
  }

  function nextFact(initial) {
    if (changing || !facts.length) return;
    if (!deck.length) deck = shuffledIds();
    var nextId = deck.pop();
    var fact = facts.find(function (item) { return item.id === nextId; });
    saveDeck();

    if (initial) {
      renderFact(fact);
      return;
    }

    changing = true;
    nextButton.disabled = true;
    card.classList.add("changing");
    window.setTimeout(function () {
      renderFact(fact);
      card.classList.remove("changing");
      nextButton.disabled = false;
      changing = false;
    }, 190);
  }

  async function shareFact() {
    if (!currentFact) return;
    var shareText = "Stuttgart-faktum #" + currentFact.id + ": " + currentFact.text;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Værd at vide om Stuttgart", text: shareText, url: currentFact.sourceUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText + "\n" + currentFact.sourceUrl);
        shareButton.textContent = "Kopieret ✓";
        window.setTimeout(function () { shareButton.textContent = "Del faktum"; }, 1800);
      }
    } catch (error) {
      // Closing the phone share sheet is not an error the user needs to see.
    }
  }

  if (facts.length !== expectedFactCount) {
    category.textContent = "Arkivfejl";
    number.textContent = "#---";
    text.classList.add("error");
    text.textContent = "Faktaarkivet indeholder " + facts.length + " facts i stedet for " + expectedFactCount + ".";
    source.hidden = true;
    nextButton.disabled = true;
    shareButton.disabled = true;
    return;
  }

  nextButton.addEventListener("click", function () { nextFact(false); });
  shareButton.addEventListener("click", shareFact);
  nextFact(true);
})();
