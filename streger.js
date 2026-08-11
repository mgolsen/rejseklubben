import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm";

const SUPABASE_URL = "https://vlcxuwyjavdmxdreuzct.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_HraJNUX2Nw6YGjr42wxNew_mp9n0Br0";

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const elements = {
  identityShell: document.querySelector("#identity-shell"),
  identityList: document.querySelector("#identity-list"),
  identityError: document.querySelector("#identity-error"),
  appShell: document.querySelector("#app-shell"),
  sessionActions: document.querySelector("#session-actions"),
  userName: document.querySelector("#user-name"),
  changePersonButton: document.querySelector("#change-person-button"),
  leaderboard: document.querySelector("#leaderboard-list"),
  stregForm: document.querySelector("#streg-form"),
  targetSelect: document.querySelector("#target-select"),
  description: document.querySelector("#streg-description"),
  descriptionCount: document.querySelector("#description-count"),
  stregError: document.querySelector("#streg-error"),
  stregSubmit: document.querySelector("#streg-submit"),
  pendingList: document.querySelector("#pending-list"),
  pendingCount: document.querySelector("#pending-count"),
  historyList: document.querySelector("#history-list"),
  historyFilter: document.querySelector("#history-filter"),
  toast: document.querySelector("#toast"),
};

const state = {
  currentUserId: null,
  profiles: [],
  profileById: new Map(),
  leaderboard: [],
  streger: [],
  realtimeChannel: null,
  loading: false,
  reloadRequested: false,
};

let toastTimer;
let reloadTimer;

function setButtonBusy(button, busy, busyText) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.defaultText;
}

function readableError(error) {
  const message = String(error?.message || error || "Ukendt fejl");
  const lower = message.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Der kunne ikke oprettes forbindelse. Kontrollér din internetforbindelse.";
  }
  if (lower.includes("could not find the table") || lower.includes("schema cache")) {
    return "Den enkle database er ikke sat op endnu. Kør supabase/no-login-setup.sql i Supabase SQL Editor.";
  }
  return message;
}

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", type === "error");
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 4400);
}

function profileName(id) {
  return state.profileById.get(id)?.display_name || "Ukendt deltager";
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function pluralStreg(total) {
  return total === 1 ? "1 streg" : `${total} streger`;
}

function emptyState(message) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}

function makeScoreCard(entry, rank, leadingTotal) {
  const card = document.createElement("article");
  card.className = "score-card";
  if (leadingTotal > 0 && entry.total === leadingTotal) card.classList.add("leader");

  const rankNode = document.createElement("div");
  rankNode.className = "score-rank";
  rankNode.textContent = rank === 1 && leadingTotal > 0 ? "Førertrøjen" : `Nr. ${rank}`;

  const name = document.createElement("div");
  name.className = "score-name";
  name.textContent = entry.display_name;

  const total = document.createElement("div");
  total.className = "score-total";
  total.textContent = pluralStreg(entry.total);

  const number = document.createElement("div");
  number.className = "score-number";
  number.setAttribute("aria-hidden", "true");
  number.textContent = entry.total;

  card.append(rankNode, name, total, number);
  return card;
}

function renderLeaderboard() {
  elements.leaderboard.replaceChildren();
  const sorted = [...state.leaderboard].sort(
    (a, b) => b.total - a.total || a.display_name.localeCompare(b.display_name, "da"),
  );

  if (!sorted.length) {
    elements.leaderboard.append(emptyState("Ingen deltagere er oprettet endnu."));
    return;
  }

  const leadingTotal = sorted[0].total;
  let displayedRank = 0;
  let previousTotal = null;

  sorted.forEach((entry, index) => {
    if (entry.total !== previousTotal) displayedRank = index + 1;
    previousTotal = entry.total;
    elements.leaderboard.append(makeScoreCard(entry, displayedRank, leadingTotal));
  });
}

function renderParticipantSelectors() {
  const previousTarget = elements.targetSelect.value;
  const previousFilter = elements.historyFilter.value;
  const targetFragment = document.createDocumentFragment();
  const filterFragment = document.createDocumentFragment();

  const targetPlaceholder = document.createElement("option");
  targetPlaceholder.value = "";
  targetPlaceholder.textContent = "Vælg den skyldige…";
  targetFragment.append(targetPlaceholder);

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alle deltagere";
  filterFragment.append(allOption);

  state.profiles.forEach((profile) => {
    if (profile.id !== state.currentUserId) {
      const targetOption = document.createElement("option");
      targetOption.value = profile.id;
      targetOption.textContent = profile.display_name;
      targetFragment.append(targetOption);
    }

    const filterOption = document.createElement("option");
    filterOption.value = profile.id;
    filterOption.textContent = profile.display_name;
    filterFragment.append(filterOption);
  });

  elements.targetSelect.replaceChildren(targetFragment);
  elements.historyFilter.replaceChildren(filterFragment);

  if (state.profileById.has(previousTarget) && previousTarget !== state.currentUserId) {
    elements.targetSelect.value = previousTarget;
  }
  if (previousFilter === "all" || state.profileById.has(previousFilter)) {
    elements.historyFilter.value = previousFilter;
  }
}

function makeStregCard(streg, isHistory = false) {
  const card = document.createElement("article");
  card.className = "streg-card";

  const top = document.createElement("div");
  top.className = "streg-top";

  const target = document.createElement("div");
  target.className = "streg-target";
  target.textContent = `Streg til ${profileName(streg.target_id)}`;

  const status = document.createElement("span");
  status.className = `status${isHistory ? " approved" : ""}`;
  status.textContent = isHistory ? "Godkendt" : "Afventer";
  top.append(target, status);

  const description = document.createElement("p");
  description.className = "streg-description";
  description.textContent = streg.description;

  const meta = document.createElement("div");
  meta.className = "streg-meta";
  if (isHistory) {
    meta.textContent = `${profileName(streg.proposed_by)} foreslog · ${profileName(streg.approved_by)} godkendte · ${formatDate(streg.approved_at)}`;
  } else {
    meta.textContent = `${profileName(streg.proposed_by)} foreslog · ${formatDate(streg.created_at)}`;
  }

  card.append(top, description, meta);

  if (!isHistory) {
    const actions = document.createElement("div");
    actions.className = "streg-actions";

    if (streg.proposed_by === state.currentUserId) {
      const withdraw = document.createElement("button");
      withdraw.className = "text-button";
      withdraw.type = "button";
      withdraw.textContent = "Træk tilbage";
      withdraw.addEventListener("click", () => withdrawStreg(streg.id, withdraw));
      actions.append(withdraw);
    } else if (streg.target_id === state.currentUserId) {
      const note = document.createElement("span");
      note.className = "streg-meta";
      note.textContent = "Du er den anklagede";
      actions.append(note);
    } else {
      const approve = document.createElement("button");
      approve.className = "button small approve";
      approve.type = "button";
      approve.textContent = "Godkend streg";
      approve.addEventListener("click", () => approveStreg(streg.id, approve));
      actions.append(approve);
    }

    card.append(actions);
  }

  return card;
}

function renderPending() {
  const pending = state.streger.filter((streg) => streg.status === "pending");
  elements.pendingCount.textContent = pending.length;
  elements.pendingList.replaceChildren();

  if (!pending.length) {
    elements.pendingList.append(emptyState("Ingen åbne sager. Det virker mistænkeligt."));
    return;
  }

  pending.forEach((streg) => elements.pendingList.append(makeStregCard(streg)));
}

function renderHistory() {
  const selectedProfile = elements.historyFilter.value;
  const history = state.streger.filter(
    (streg) => streg.status === "approved"
      && (selectedProfile === "all" || streg.target_id === selectedProfile),
  );

  elements.historyList.replaceChildren();
  if (!history.length) {
    const message = selectedProfile === "all"
      ? "Protokollen er endnu ren. Nyd det, mens det varer."
      : "Denne deltager har mirakuløst nok ingen godkendte streger.";
    elements.historyList.append(emptyState(message));
    return;
  }

  history.forEach((streg) => elements.historyList.append(makeStregCard(streg, true)));
}

function renderAll() {
  const ownProfile = state.profileById.get(state.currentUserId);
  elements.userName.textContent = ownProfile?.display_name || "…";
  renderParticipantSelectors();
  renderLeaderboard();
  renderPending();
  renderHistory();
}

async function loadData() {
  if (state.loading) {
    state.reloadRequested = true;
    return;
  }

  state.loading = true;
  try {
    const [profilesResult, leaderboardResult, stregerResult] = await Promise.all([
      db.from("players")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name", { ascending: true }),
      db.from("game_leaderboard")
        .select("id, display_name, total"),
      db.from("game_streger")
        .select("id, target_id, proposed_by, description, status, approved_by, approved_at, created_at")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(250),
    ]);

    const error = profilesResult.error || leaderboardResult.error || stregerResult.error;
    if (error) throw error;

    state.profiles = profilesResult.data || [];
    state.profileById = new Map(state.profiles.map((profile) => [profile.id, profile]));
    state.leaderboard = (leaderboardResult.data || []).map((entry) => ({
      ...entry,
      total: Number(entry.total) || 0,
    }));
    state.streger = stregerResult.data || [];

    renderIdentityChoices();
    if (state.currentUserId && !state.profileById.has(state.currentUserId)) {
      state.currentUserId = null;
      localStorage.removeItem("rejseklubben-player-id");
      showIdentityPicker();
    } else if (state.currentUserId) {
      renderAll();
    }
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    state.loading = false;
    if (state.reloadRequested) {
      state.reloadRequested = false;
      await loadData();
    }
  }
}

function scheduleReload() {
  window.clearTimeout(reloadTimer);
  reloadTimer = window.setTimeout(loadData, 180);
}

async function proposeStreg(event) {
  event.preventDefault();
  elements.stregError.textContent = "";
  const targetId = elements.targetSelect.value;
  const description = elements.description.value.trim();

  if (!targetId) {
    elements.stregError.textContent = "Vælg først, hvem der skal have stregen.";
    return;
  }

  setButtonBusy(elements.stregSubmit, true, "Sender til dommerbordet…");
  const { error } = await db.rpc("submit_streg", {
    p_actor_id: state.currentUserId,
    p_target_id: targetId,
    p_description: description,
  });
  setButtonBusy(elements.stregSubmit, false);

  if (error) {
    elements.stregError.textContent = readableError(error);
    return;
  }

  elements.stregForm.reset();
  elements.descriptionCount.textContent = "0";
  showToast("Forslaget er sendt. Nu mangler kun en meddommer.");
  await loadData();
}

async function approveStreg(id, button) {
  setButtonBusy(button, true, "Godkender…");
  const { error } = await db.rpc("second_streg", {
    p_actor_id: state.currentUserId,
    p_streg_id: id,
  });
  if (error) {
    setButtonBusy(button, false);
    showToast(readableError(error), "error");
    return;
  }

  showToast("Dommen er faldet. Stregen tæller.");
  await loadData();
}

async function withdrawStreg(id, button) {
  setButtonBusy(button, true, "Trækker tilbage…");
  const { error } = await db.rpc("retract_streg", {
    p_actor_id: state.currentUserId,
    p_streg_id: id,
  });
  if (error) {
    setButtonBusy(button, false);
    showToast(readableError(error), "error");
    return;
  }

  showToast("Forslaget er trukket tilbage.");
  await loadData();
}

function renderIdentityChoices() {
  elements.identityList.replaceChildren();
  if (!state.profiles.length) {
    elements.identityList.append(emptyState("Ingen deltagere er oprettet endnu."));
    return;
  }

  state.profiles.forEach((profile) => {
    const button = document.createElement("button");
    button.className = "identity-button";
    button.type = "button";

    const initial = document.createElement("span");
    initial.className = "identity-initial";
    initial.setAttribute("aria-hidden", "true");
    initial.textContent = profile.display_name.charAt(0).toUpperCase();

    const name = document.createElement("span");
    name.textContent = profile.display_name;
    button.append(initial, name);
    button.addEventListener("click", () => selectIdentity(profile.id));
    elements.identityList.append(button);
  });
}

function selectIdentity(playerId) {
  if (!state.profileById.has(playerId)) return;
  state.currentUserId = playerId;
  localStorage.setItem("rejseklubben-player-id", playerId);
  elements.identityError.textContent = "";
  elements.identityShell.hidden = true;
  elements.appShell.hidden = false;
  elements.sessionActions.hidden = false;
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showIdentityPicker() {
  elements.identityShell.hidden = false;
  elements.appShell.hidden = true;
  elements.sessionActions.hidden = true;
  renderIdentityChoices();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function subscribeToChanges() {
  if (state.realtimeChannel) db.removeChannel(state.realtimeChannel);
  state.realtimeChannel = db
    .channel("streger-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_streger" },
      scheduleReload,
    )
    .subscribe();
}

elements.stregForm.addEventListener("submit", proposeStreg);
elements.description.addEventListener("input", () => {
  elements.descriptionCount.textContent = elements.description.value.length;
});
elements.historyFilter.addEventListener("change", renderHistory);
elements.changePersonButton.addEventListener("click", showIdentityPicker);

await loadData();
subscribeToChanges();

const rememberedPlayer = localStorage.getItem("rejseklubben-player-id");
if (rememberedPlayer && state.profileById.has(rememberedPlayer)) {
  selectIdentity(rememberedPlayer);
} else {
  showIdentityPicker();
}
