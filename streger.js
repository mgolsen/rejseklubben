import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm";

const SUPABASE_URL = "https://vlcxuwyjavdmxdreuzct.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_HraJNUX2Nw6YGjr42wxNew_mp9n0Br0";

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const elements = {
  identityShell: document.querySelector("#identity-shell"),
  identityPicker: document.querySelector("#identity-picker"),
  identityList: document.querySelector("#identity-list"),
  identityError: document.querySelector("#identity-error"),
  claimForm: document.querySelector("#claim-form"),
  claimPlayerName: document.querySelector("#claim-player-name"),
  claimCode: document.querySelector("#claim-code"),
  claimError: document.querySelector("#claim-error"),
  claimSubmit: document.querySelector("#claim-submit"),
  claimBack: document.querySelector("#claim-back"),
  appShell: document.querySelector("#app-shell"),
  sessionActions: document.querySelector("#session-actions"),
  userName: document.querySelector("#user-name"),
  logoutButton: document.querySelector("#logout-button"),
  leaderboard: document.querySelector("#leaderboard-list"),
  stregForm: document.querySelector("#streg-form"),
  proposalType: document.querySelector("#proposal-type"),
  targetSelect: document.querySelector("#target-select"),
  targetLabel: document.querySelector("#target-label"),
  amountField: document.querySelector("#amount-field"),
  amountSelect: document.querySelector("#streg-amount"),
  descriptionLabel: document.querySelector("#description-label"),
  description: document.querySelector("#streg-description"),
  descriptionCount: document.querySelector("#description-count"),
  stregError: document.querySelector("#streg-error"),
  stregSubmit: document.querySelector("#streg-submit"),
  pendingList: document.querySelector("#pending-list"),
  pendingCount: document.querySelector("#pending-count"),
  quickPendingCount: document.querySelector("#quick-pending-count"),
  historyList: document.querySelector("#history-list"),
  historyFilter: document.querySelector("#history-filter"),
  toast: document.querySelector("#toast"),
};

const state = {
  currentUserId: null,
  pendingClaimPlayerId: null,
  profiles: [],
  profileById: new Map(),
  leaderboard: [],
  streger: [],
  votersByStreg: new Map(),
  expiryReloads: new Set(),
  realtimeChannel: null,
  loading: false,
  reloadRequested: false,
};

let toastTimer;
let reloadTimer;
let countdownTimer;

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
  if (lower.includes("anonymous") && (lower.includes("disabled") || lower.includes("provider"))) {
    return "Anonyme sessioner er ikke slået til i Supabase endnu. Aktivér Anonymous Sign-Ins under Authentication.";
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

function proposalAffectedPlayer(streg) {
  if (streg.proposal_type === "penalty" && streg.status === "failed") {
    return streg.proposed_by;
  }
  return streg.target_id;
}

function requiredVotesForAmount(amount) {
  return { 1: 2, 2: 4, 3: 8 }[amount] || 2;
}

function countdownText(deadline) {
  const milliseconds = new Date(deadline).getTime() - Date.now();
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")} tilbage`;
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
  targetPlaceholder.textContent = elements.proposalType.value === "pardon"
    ? "Vælg den, der skal benådes…"
    : "Vælg den skyldige…";
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

function updateProposalForm() {
  const isPardon = elements.proposalType.value === "pardon";
  elements.amountField.hidden = isPardon;
  elements.amountSelect.required = !isPardon;
  elements.targetLabel.textContent = isPardon ? "Hvem skal benådes?" : "Hvem skal straffes?";
  elements.descriptionLabel.textContent = isPardon ? "Hvorfor skal personen benådes?" : "Hvad skete der?";
  elements.description.placeholder = isPardon
    ? "Har udvist helt usædvanlig god stil…"
    : "Spildte øl ud over sig selv før frokost…";
  elements.stregSubmit.textContent = isPardon ? "Send benådning til afstemning" : "Send straf til afstemning";
  delete elements.stregSubmit.dataset.defaultText;
  renderParticipantSelectors();
}

function makeStregCard(streg, isHistory = false) {
  const card = document.createElement("article");
  card.className = "streg-card";

  const top = document.createElement("div");
  top.className = "streg-top";

  const target = document.createElement("div");
  target.className = "streg-target";
  const amount = Number(streg.amount) || 1;
  const isPardon = streg.proposal_type === "pardon";
  if (isPardon) {
    target.textContent = streg.status === "failed"
      ? `Forslag om benådning af ${profileName(streg.target_id)}`
      : `Benådning af ${profileName(streg.target_id)} · −1 streg`;
  } else if (streg.status === "failed") {
    target.textContent = `${pluralStreg(amount)} til ${profileName(streg.proposed_by)} · tilbageslag`;
  } else {
    target.textContent = `${pluralStreg(amount)} til ${profileName(streg.target_id)}`;
  }

  const status = document.createElement("span");
  status.className = `status${streg.status === "approved" ? " approved" : ""}${streg.status === "failed" ? " failed" : ""}`;
  if (streg.status === "approved") {
    status.textContent = isPardon ? "Benådet" : "Vedtaget";
  } else if (streg.status === "failed") {
    status.textContent = isPardon ? "Afvist" : "Tilbageslag";
  } else {
    status.textContent = isPardon ? "Benådning" : "Afstemning";
  }
  top.append(target, status);

  const description = document.createElement("p");
  description.className = "streg-description";
  description.textContent = streg.description;

  const meta = document.createElement("div");
  meta.className = "streg-meta";
  if (isHistory) {
    if (streg.status === "approved" && streg.required_votes === 1 && streg.vote_count === 0) {
      meta.textContent = `${profileName(streg.proposed_by)} foreslog · godkendt under de tidligere regler · ${formatDate(streg.approved_at)}`;
    } else if (streg.status === "approved") {
      meta.textContent = `${profileName(streg.proposed_by)} foreslog · ${streg.vote_count}/${streg.required_votes} stemmer · ${formatDate(streg.approved_at)}`;
    } else if (isPardon) {
      meta.textContent = `${profileName(streg.proposed_by)} foreslog · fik ${streg.vote_count}/${streg.required_votes} stemmer · udløb ${formatDate(streg.deadline)}`;
    } else {
      meta.textContent = `${profileName(streg.proposed_by)} foreslog · fik ${streg.vote_count}/${streg.required_votes} stemmer · straffen gik tilbage til forslagsstilleren`;
    }
  } else {
    meta.textContent = `${profileName(streg.proposed_by)} foreslog · ${formatDate(streg.created_at)}`;
  }

  card.append(top, description, meta);

  if (!isHistory) {
    const voting = document.createElement("div");
    voting.className = "voting-progress";

    const votingText = document.createElement("div");
    votingText.className = "voting-text";
    votingText.textContent = `${streg.vote_count} af ${streg.required_votes} stemmer`;

    const countdown = document.createElement("div");
    countdown.className = "countdown";
    countdown.dataset.deadline = streg.deadline;
    countdown.dataset.stregId = streg.id;
    countdown.textContent = countdownText(streg.deadline);

    const track = document.createElement("div");
    track.className = "vote-track";
    const fill = document.createElement("span");
    fill.style.width = `${Math.min(100, (streg.vote_count / streg.required_votes) * 100)}%`;
    track.append(fill);
    voting.append(votingText, countdown, track);
    card.append(voting);

    const actions = document.createElement("div");
    actions.className = "streg-actions";
    const hasVoted = state.votersByStreg.get(streg.id)?.has(state.currentUserId);

    if (streg.proposed_by === state.currentUserId && streg.vote_count === 0) {
      const withdraw = document.createElement("button");
      withdraw.className = "text-button";
      withdraw.type = "button";
      withdraw.textContent = "Træk tilbage";
      withdraw.addEventListener("click", () => withdrawStreg(streg.id, withdraw));
      actions.append(withdraw);
    } else if (streg.proposed_by === state.currentUserId) {
      const note = document.createElement("span");
      note.className = "streg-meta";
      note.textContent = "Du stillede forslaget";
      actions.append(note);
    } else if (streg.target_id === state.currentUserId) {
      const note = document.createElement("span");
      note.className = "streg-meta";
      note.textContent = isPardon ? "Du er den mulige benådede" : "Du er den anklagede";
      actions.append(note);
    } else if (hasVoted) {
      const note = document.createElement("span");
      note.className = "voted-note";
      note.textContent = "✓ Du har stemt";
      actions.append(note);
    } else {
      const vote = document.createElement("button");
      vote.className = "button small approve";
      vote.type = "button";
      vote.textContent = "Godkend · stem for";
      vote.addEventListener("click", () => voteStreg(streg, vote));
      actions.append(vote);
    }

    card.append(actions);
  }

  return card;
}

function renderPending() {
  const pending = state.streger.filter((streg) => streg.status === "open");
  elements.pendingCount.textContent = pending.length;
  elements.quickPendingCount.textContent = pending.length;
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
    (streg) => ["approved", "failed"].includes(streg.status)
      && (selectedProfile === "all" || proposalAffectedPlayer(streg) === selectedProfile),
  );

  elements.historyList.replaceChildren();
  if (!history.length) {
    const message = selectedProfile === "all"
      ? "Protokollen er endnu ren. Nyd det, mens det varer."
      : "Denne deltager har ingen afgjorte forslag i protokollen.";
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
  updateCountdowns();
}

async function loadData() {
  if (state.loading) {
    state.reloadRequested = true;
    return;
  }

  state.loading = true;
  try {
    const [profilesResult, leaderboardResult, stregerResult, votesResult] = await Promise.all([
      db.from("players")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name", { ascending: true }),
      db.from("game_leaderboard")
        .select("id, display_name, total"),
      db.from("game_proposal_status")
        .select("id, target_id, proposed_by, description, amount, proposal_type, required_votes, deadline, vote_count, status, approved_by, approved_at, created_at")
        .in("status", ["open", "approved", "failed"])
        .order("created_at", { ascending: false })
        .limit(250),
      db.from("game_streg_votes")
        .select("streg_id, voter_id"),
    ]);

    const error = profilesResult.error || leaderboardResult.error || stregerResult.error || votesResult.error;
    if (error) throw error;

    state.profiles = profilesResult.data || [];
    state.profileById = new Map(state.profiles.map((profile) => [profile.id, profile]));
    state.leaderboard = (leaderboardResult.data || []).map((entry) => ({
      ...entry,
      total: Number(entry.total) || 0,
    }));
    state.streger = stregerResult.data || [];
    state.votersByStreg = new Map();
    (votesResult.data || []).forEach((vote) => {
      if (!state.votersByStreg.has(vote.streg_id)) {
        state.votersByStreg.set(vote.streg_id, new Set());
      }
      state.votersByStreg.get(vote.streg_id).add(vote.voter_id);
    });

    if (state.currentUserId && !state.profileById.has(state.currentUserId)) {
      state.currentUserId = null;
      showIdentityPicker();
    } else if (state.currentUserId) {
      renderAll();
    } else {
      renderIdentityChoices();
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

function updateCountdowns() {
  document.querySelectorAll(".countdown[data-deadline]").forEach((node) => {
    const remaining = new Date(node.dataset.deadline).getTime() - Date.now();
    node.textContent = countdownText(node.dataset.deadline);
    node.classList.toggle("urgent", remaining <= 30000);

    if (remaining <= 0 && !state.expiryReloads.has(node.dataset.stregId)) {
      state.expiryReloads.add(node.dataset.stregId);
      window.setTimeout(loadData, 450);
    }
  });
}

async function proposeStreg(event) {
  event.preventDefault();
  elements.stregError.textContent = "";
  const proposalType = elements.proposalType.value;
  const targetId = elements.targetSelect.value;
  const amount = proposalType === "pardon" ? 1 : Number(elements.amountSelect.value);
  const description = elements.description.value.trim();

  if (!targetId) {
    elements.stregError.textContent = proposalType === "pardon"
      ? "Vælg først, hvem der skal benådes."
      : "Vælg først, hvem der skal have stregen.";
    return;
  }
  if (![1, 2, 3].includes(amount)) {
    elements.stregError.textContent = "Vælg 1, 2 eller 3 streger.";
    return;
  }

  setButtonBusy(elements.stregSubmit, true, "Åbner afstemningen…");
  const request = proposalType === "pardon"
    ? db.rpc("device_submit_pardon", {
      p_target_id: targetId,
      p_description: description,
    })
    : db.rpc("device_submit_streg", {
      p_target_id: targetId,
      p_description: description,
      p_amount: amount,
    });
  const { error } = await request;
  setButtonBusy(elements.stregSubmit, false);

  if (error) {
    elements.stregError.textContent = readableError(error);
    return;
  }

  elements.stregForm.reset();
  elements.descriptionCount.textContent = "0";
  updateProposalForm();
  const votesNeeded = proposalType === "pardon" ? 8 : requiredVotesForAmount(amount);
  showToast(`Afstemningen er åbnet. Forslaget kræver ${votesNeeded} stemmer på to minutter.`);
  await loadData();
}

async function voteStreg(streg, button) {
  setButtonBusy(button, true, "Stemmer…");
  const { data, error } = await db.rpc("device_vote_streg", {
    p_streg_id: streg.id,
  });
  if (error) {
    setButtonBusy(button, false);
    showToast(readableError(error), "error");
    return;
  }

  if (data?.status === "approved") {
    showToast(streg.proposal_type === "pardon" ? "Benådningen er vedtaget." : "Forslaget er vedtaget. Straffen tæller.");
  } else {
    showToast(`Din stemme er registreret (${data?.vote_count || streg.vote_count + 1}/${data?.required_votes || streg.required_votes}).`);
  }
  await loadData();
}

async function withdrawStreg(id, button) {
  setButtonBusy(button, true, "Trækker tilbage…");
  const { error } = await db.rpc("device_retract_streg", {
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
    button.addEventListener("click", () => showClaimForm(profile.id));
    elements.identityList.append(button);
  });
}

function activateIdentity(playerId) {
  if (!state.profileById.has(playerId)) return;
  state.currentUserId = playerId;
  elements.identityError.textContent = "";
  elements.claimError.textContent = "";
  elements.identityShell.hidden = true;
  elements.appShell.hidden = false;
  elements.sessionActions.hidden = false;
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showClaimForm(playerId) {
  const profile = state.profileById.get(playerId);
  if (!profile) return;

  state.pendingClaimPlayerId = playerId;
  elements.claimPlayerName.textContent = profile.display_name;
  elements.claimCode.value = "";
  elements.claimError.textContent = "";
  elements.identityPicker.hidden = true;
  elements.claimForm.hidden = false;
  elements.claimCode.focus();
}

function showIdentityPicker() {
  state.pendingClaimPlayerId = null;
  elements.identityShell.hidden = false;
  elements.appShell.hidden = true;
  elements.sessionActions.hidden = true;
  elements.identityPicker.hidden = false;
  elements.claimForm.hidden = true;
  elements.claimError.textContent = "";
  renderIdentityChoices();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function claimIdentity(event) {
  event.preventDefault();
  elements.claimError.textContent = "";

  const playerId = state.pendingClaimPlayerId;
  const code = elements.claimCode.value.trim();
  if (!playerId || !/^[0-9]{2}$/.test(code)) {
    elements.claimError.textContent = "Koden skal bestå af to cifre.";
    return;
  }

  setButtonBusy(elements.claimSubmit, true, "Kontrollerer koden…");
  const { data, error } = await db.rpc("claim_player", {
    p_player_id: playerId,
    p_code: code,
  });
  setButtonBusy(elements.claimSubmit, false);

  if (error) {
    elements.claimError.textContent = readableError(error);
    return;
  }
  if (!data?.ok) {
    elements.claimError.textContent = data?.message || "Koden kunne ikke godkendes.";
    return;
  }

  showToast(`${data.player.display_name} er nu logget ind på denne telefon.`);
  activateIdentity(data.player.id);
}

async function logoutIdentity() {
  const profile = state.profileById.get(state.currentUserId);
  if (!profile) return;

  const confirmed = window.confirm(
    `Vil du logge ${profile.display_name} ud? Du skal bruge den tocifrede kode for at logge ind igen.`,
  );
  if (!confirmed) return;

  setButtonBusy(elements.logoutButton, true, "Logger ud…");
  const { data, error } = await db.rpc("release_player");
  setButtonBusy(elements.logoutButton, false);

  if (error) {
    showToast(readableError(error), "error");
    return;
  }
  if (!data?.ok) {
    showToast(data?.message || "Det lykkedes ikke at logge ud.", "error");
    return;
  }

  state.currentUserId = null;
  showIdentityPicker();
  showToast(`${profile.display_name} er logget ud. Vælg en deltager for at fortsætte.`);
}

async function ensureAnonymousSession() {
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;

  const { data, error } = await db.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

async function getClaimedPlayer() {
  const { data, error } = await db.rpc("get_claimed_player");
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data || null;
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
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_streg_votes" },
      scheduleReload,
    )
    .subscribe();
}

elements.stregForm.addEventListener("submit", proposeStreg);
elements.proposalType.addEventListener("change", updateProposalForm);
elements.description.addEventListener("input", () => {
  elements.descriptionCount.textContent = elements.description.value.length;
});
elements.historyFilter.addEventListener("change", renderHistory);
elements.claimForm.addEventListener("submit", claimIdentity);
elements.claimBack.addEventListener("click", showIdentityPicker);
elements.logoutButton.addEventListener("click", logoutIdentity);
elements.claimCode.addEventListener("input", () => {
  elements.claimCode.value = elements.claimCode.value.replace(/\D/g, "").slice(0, 2);
});

async function start() {
  localStorage.removeItem("rejseklubben-player-id");
  try {
    await ensureAnonymousSession();
    await loadData();
    const claimedPlayer = await getClaimedPlayer();
    if (claimedPlayer && state.profileById.has(claimedPlayer.id)) {
      activateIdentity(claimedPlayer.id);
    } else {
      showIdentityPicker();
    }
    updateProposalForm();
    subscribeToChanges();
    window.clearInterval(countdownTimer);
    countdownTimer = window.setInterval(updateCountdowns, 1000);
  } catch (error) {
    elements.identityError.textContent = readableError(error);
    showIdentityPicker();
  }
}

await start();
