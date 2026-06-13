const statusLabels = {
  "◎": "参加できる",
  "○": "たぶん参加",
  "△": "未定",
  "✕": "難しい",
};

const profileSeparator = "|||";
const colorOptions = [
  ["グリーン", "#176b5d"],
  ["ミントグリーン", "#2f9e7c"],
  ["ブルー", "#2872b8"],
  ["ネイビーブルー", "#315aa8"],
  ["パープル", "#6b61b5"],
  ["バイオレット", "#8b5bb5"],
  ["ピンク", "#d45f8c"],
  ["ライトピンク", "#e4869f"],
  ["レッド", "#c24848"],
  ["コーラル", "#df6b5d"],
  ["オレンジ", "#d67b31"],
  ["イエロー", "#c89220"],
  ["レモンイエロー", "#b6a326"],
  ["ライトグリーン", "#6e9b42"],
  ["オリーブ", "#52784b"],
  ["ライトブルー", "#3f91a7"],
  ["ブルーグレー", "#58768f"],
  ["グレー", "#737b78"],
  ["ブラウン", "#7b5946"],
  ["ブラック", "#333936"],
];

const profileKey = "climb-sync-profile-v3";
const themeKey = "climb-sync-theme-v3";
const accessKey = "climb-sync-access-v1";
const deletedMarker = "__CLIMB_SYNC_DELETED__";
const api = window.CLIMB_SYNC_CONFIG || {};
const inviteToken = new URLSearchParams(location.hash.slice(1)).get("invite");
const hasAccess = inviteToken === api.inviteKey || localStorage.getItem(accessKey) === api.inviteKey;

if (inviteToken === api.inviteKey) {
  localStorage.setItem(accessKey, api.inviteKey);
  history.replaceState(null, "", location.pathname + location.search);
}

if (hasAccess) {
  document.body.classList.remove("access-locked");
}

const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let timelineWeekStart = startOfWeek(today);
let selectedDate = "";
let attendances = {};

const japaneseHolidays = new Map([
  ["2026-01-01", "元日"],
  ["2026-01-12", "成人の日"],
  ["2026-02-11", "建国記念の日"],
  ["2026-02-23", "天皇誕生日"],
  ["2026-03-20", "春分の日"],
  ["2026-04-29", "昭和の日"],
  ["2026-05-03", "憲法記念日"],
  ["2026-05-04", "みどりの日"],
  ["2026-05-05", "こどもの日"],
  ["2026-05-06", "休日"],
  ["2026-07-20", "海の日"],
  ["2026-08-11", "山の日"],
  ["2026-09-21", "敬老の日"],
  ["2026-09-22", "休日"],
  ["2026-09-23", "秋分の日"],
  ["2026-10-12", "スポーツの日"],
  ["2026-11-03", "文化の日"],
  ["2026-11-23", "勤労感謝の日"],
  ["2027-01-01", "元日"],
  ["2027-01-11", "成人の日"],
  ["2027-02-11", "建国記念の日"],
  ["2027-02-23", "天皇誕生日"],
  ["2027-03-21", "春分の日"],
  ["2027-03-22", "休日"],
  ["2027-04-29", "昭和の日"],
  ["2027-05-03", "憲法記念日"],
  ["2027-05-04", "みどりの日"],
  ["2027-05-05", "こどもの日"],
  ["2027-07-19", "海の日"],
  ["2027-08-11", "山の日"],
  ["2027-09-20", "敬老の日"],
  ["2027-09-23", "秋分の日"],
  ["2027-10-11", "スポーツの日"],
  ["2027-11-03", "文化の日"],
  ["2027-11-23", "勤労感謝の日"],
]);

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey));
    if (saved?.id && saved?.name) return saved;
  } catch {}
  const profile = {
    id: crypto.randomUUID(),
    name: "あなた",
    greeting: "",
    initials: "あなた",
    color: "#176b5d",
  };
  localStorage.setItem(profileKey, JSON.stringify(profile));
  return profile;
}

let profile = loadProfile();
let theme = localStorage.getItem(themeKey) || "light";

const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const dayDialog = document.querySelector("#dayDialog");
const dialogTitle = document.querySelector("#dialogTitle");
const daySummary = document.querySelector("#daySummary");
const attendanceForm = document.querySelector("#attendanceForm");
const commentThread = document.querySelector("#commentThread");
const timeline = document.querySelector("#timeline");
const toast = document.querySelector("#toast");
const syncStatus = document.querySelector("#syncStatus");
const deleteAttendanceButton = document.querySelector("#deleteAttendance");
const memberProfileDialog = document.querySelector("#memberProfileDialog");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function dayColorClass(date) {
  if (japaneseHolidays.has(dateKey(date)) || date.getDay() === 0) return "is-sunday";
  if (date.getDay() === 6) return "is-saturday";
  return "";
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }).format(date);
}

function formatDay(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function initials(name) {
  return name.trim().slice(0, 4).toUpperCase() || "自分";
}

function packProfileName(name, greeting = "") {
  return `${name}${profileSeparator}${greeting}`;
}

function unpackProfileName(value) {
  const [name, ...greetingParts] = String(value || "").split(profileSeparator);
  return {
    name: name || "名前なし",
    greeting: greetingParts.join(profileSeparator).slice(0, 20),
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setSyncStatus(text, failed = false) {
  syncStatus.textContent = text;
  syncStatus.style.color = failed ? "var(--nope)" : "";
}

function headers(extra = {}) {
  return {
    apikey: api.anonKey,
    Authorization: `Bearer ${api.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function mapRow(row) {
  const comment = row.comment || "";
  const sharedProfile = unpackProfileName(row.nickname);
  return {
    memberId: row.user_id,
    name: sharedProfile.name,
    greeting: sharedProfile.greeting,
    initials: initials(sharedProfile.name),
    color: row.color_hex,
    status: row.status,
    start: row.start_time?.slice(0, 5) || "",
    end: row.end_time?.slice(0, 5) || "",
    comment: comment === deletedMarker ? "" : comment,
    isDeleted: comment === deletedMarker
      || (row.status === "✕" && !row.start_time && !row.end_time && !comment),
  };
}

async function loadAttendances({ quiet = false } = {}) {
  if (!api.url || !api.anonKey) {
    setSyncStatus("設定が必要", true);
    return;
  }
  if (!quiet) setSyncStatus("同期中");
  try {
    const response = await fetch(
      `${api.url}/rest/v1/attendances?select=*&group_code=eq.CLIMB-610&order=date.asc`,
      { headers: headers(), cache: "no-store" },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    attendances = rows.reduce((grouped, row) => {
      (grouped[row.date] ||= []).push(mapRow(row));
      return grouped;
    }, {});
    renderAll();
    if (selectedDate && dayDialog.open) renderDayDetails();
    setSyncStatus("同期済み");
  } catch (error) {
    console.error(error);
    setSyncStatus("接続エラー", true);
    if (!quiet) showToast("共有データを読み込めませんでした");
  }
}

async function saveAttendance(item) {
  setSyncStatus("保存中");
  const body = {
    group_code: "CLIMB-610",
    date: selectedDate,
    user_id: profile.id,
    nickname: packProfileName(profile.name, profile.greeting),
    color_hex: profile.color,
    status: item.status,
    start_time: item.start || null,
    end_time: item.end || null,
    comment: item.comment,
    updated_at: new Date().toISOString(),
  };
  const response = await fetch(`${api.url}/rest/v1/attendances?on_conflict=group_code,date,user_id`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function syncProfileToAttendances() {
  const response = await fetch(
    `${api.url}/rest/v1/attendances?group_code=eq.CLIMB-610&user_id=eq.${encodeURIComponent(profile.id)}`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        nickname: packProfileName(profile.name, profile.greeting),
        color_hex: profile.color,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function deleteAttendance() {
  setSyncStatus("削除中");
  await saveAttendance({
    status: "✕",
    start: "",
    end: "",
    comment: deletedMarker,
  });
}

function relevantAttendances(key) {
  return (attendances[key] || []).filter((item) => !item.isDeleted && item.status !== "✕");
}

function activeAttendances(key) {
  return (attendances[key] || []).filter((item) => !item.isDeleted);
}

function renderAvatar(member, title) {
  return `<span class="avatar" style="background:${member.color}" title="${escapeHtml(title || member.name)}">${escapeHtml(member.initials)}</span>`;
}

function renderCalendar() {
  calendarTitle.textContent = formatMonth(visibleMonth);
  calendarGrid.innerHTML = "";
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  const todayKey = dateKey(new Date());

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const items = relevantAttendances(key);
    const hasMyAttendance = items.some((item) => item.memberId === profile.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    if (date.getMonth() !== month) button.classList.add("is-muted");
    if (key === todayKey) button.classList.add("is-today");
    if (items.length >= 3) {
      button.classList.add("is-crowded");
    } else if (items.length === 2) {
      button.classList.add("is-popular");
    }
    const colorClass = dayColorClass(date);
    if (colorClass) button.classList.add(colorClass);
    const holiday = japaneseHolidays.get(key);
    button.setAttribute("aria-label", `${formatDay(date)}、参加予定${items.length}人`);
    const avatarHtml = items.slice(0, 4).map((item) => renderAvatar(item)).join("");
    const note = escapeHtml(items.find((item) => item.comment)?.comment || "");
    button.innerHTML = `
      <span class="day-number">
        <span class="date-label">
          <span title="${holiday || ""}">${date.getDate()}</span>
          ${hasMyAttendance ? `<span class="my-attendance-check" title="自分の予定あり" aria-label="自分の予定あり">✓</span>` : ""}
        </span>
        ${items.length ? `<span class="count-badge">${items.length}人</span>` : ""}
      </span>
      <span class="avatars">${avatarHtml}</span>
      <span class="day-note">${note}</span>
    `;
    button.addEventListener("click", () => openDay(key));
    calendarGrid.appendChild(button);
  }
  updateBestDayNotice();
}

function openDay(key) {
  selectedDate = key;
  dialogTitle.textContent = formatDay(parseDate(key));
  renderDayDetails();
  dayDialog.showModal();
}

function renderDayDetails() {
  const visible = activeAttendances(selectedDate);
  daySummary.innerHTML = visible.length
    ? visible.map((item) => `
      <div class="participant">
        ${renderAvatar(item)}
        <div>
          <strong>${escapeHtml(item.name)} <span>${item.status}</span></strong>
          <span>${statusLabels[item.status]}</span>
        </div>
        <span>${item.start || "--:--"}〜${item.end || "--:--"}</span>
      </div>
    `).join("")
    : `<p class="muted">まだ参加予定はありません。最初に予定を入れてみましょう。</p>`;

  const mine = visible.find((item) => item.memberId === profile.id);
  deleteAttendanceButton.hidden = !mine;
  attendanceForm.reset();
  const status = mine?.status || "◎";
  const radio = attendanceForm.querySelector(`[name="status"][value="${status}"]`);
  if (radio) radio.checked = true;
  document.querySelector("#startTime").value = mine?.start || "19:00";
  document.querySelector("#endTime").value = mine?.end || "21:30";
  document.querySelector("#commentInput").value = mine?.comment || "";

  const comments = visible.filter((item) => item.comment);
  commentThread.innerHTML = comments.length
    ? `<strong>みんなのコメント</strong>${comments.map((item) =>
        `<div class="comment"><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.comment)}</p></div>`
      ).join("")}`
    : "";
}

function renderTimeline() {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(timelineWeekStart);
    date.setDate(timelineWeekStart.getDate() + index);
    return date;
  });
  const first = dates[0];
  const last = dates[6];
  document.querySelector("#timelineTitle").textContent =
    `${first.getMonth() + 1}/${first.getDate()}〜${last.getMonth() + 1}/${last.getDate()}の重なり`;
  const timeSlots = [11, 13, 15, 17, 19, 21];
  const header = `<div class="timeline-row"><div class="time-label">時間</div>${dates.map((date) =>
    `<div class="timeline-cell ${dayColorClass(date)}"><strong title="${japaneseHolidays.get(dateKey(date)) || ""}">${date.getMonth() + 1}/${date.getDate()}</strong><br><span>${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}</span></div>`
  ).join("")}</div>`;
  const rows = timeSlots.map((hour) => {
    const cells = dates.map((date) => {
      const items = relevantAttendances(dateKey(date)).filter((item) => {
        const start = Number((item.start || "99:00").split(":")[0]);
        const end = Number((item.end || "00:00").split(":")[0]);
        return start <= hour && end > hour;
      });
      return `<div class="timeline-cell ${dayColorClass(date)}">${items.map((item) =>
        `<span class="timeline-pill" style="background:${item.color}">${escapeHtml(item.name)}</span>`
      ).join("")}</div>`;
    }).join("");
    return `<div class="timeline-row"><div class="time-label">${hour}:00</div>${cells}</div>`;
  }).join("");
  timeline.innerHTML = `<div class="timeline-table">${header}${rows}</div>`;
}

function getBestDay() {
  return Object.entries(attendances)
    .filter(([key]) => parseDate(key).getMonth() === visibleMonth.getMonth())
    .map(([key]) => ({ key, count: relevantAttendances(key).length }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))[0];
}

function updateBestDayNotice() {
  const best = getBestDay();
  document.querySelector("#bestDayNotice").textContent = best
    ? `${formatDay(parseDate(best.key))}が最多で、${best.count}人参加予定です。`
    : "今月はまだ参加予定がありません。";
}

function renderMembers() {
  const unique = new Map([[profile.id, profile]]);
  Object.values(attendances).flat().filter((item) => !item.isDeleted)
    .forEach((item) => unique.set(item.memberId, item));
  document.querySelector("#memberStrip").innerHTML = [...unique.values()]
    .map((member) => `
      <button class="member-chip" type="button" data-member-id="${escapeHtml(member.memberId || member.id)}">
        ${renderAvatar(member)}
        <span>
          <strong>${member.memberId === profile.id || member.id === profile.id ? "自分" : "メンバー"}</strong>
          ${escapeHtml(member.name)}
        </span>
      </button>
    `)
    .join("");
  document.querySelector("#nicknameInput").value = profile.name;
  document.querySelector("#greetingInput").value = profile.greeting || "";
  document.querySelector("#colorInput").value = profile.color;
  renderColorPicker();
  document.querySelectorAll(".member-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const member = unique.get(button.dataset.memberId);
      if (member) openMemberProfile(member);
    });
  });
}

function renderColorPicker() {
  const picker = document.querySelector("#colorPicker");
  picker.innerHTML = colorOptions.map(([name, value]) =>
    `<option value="${value}"${profile.color === value ? " selected" : ""}>${name}</option>`
  ).join("");
  updateSelectedColor(picker.value);
}

function updateSelectedColor(value) {
  document.querySelector("#colorInput").value = value;
  document.querySelector("#selectedColor").style.background = value;
}

function openMemberProfile(member) {
  const isSelf = (member.memberId || member.id) === profile.id;
  document.querySelector("#memberProfileRelation").textContent =
    isSelf ? "あなたのプロフィール" : "メンバープロフィール";
  document.querySelector("#memberProfileName").textContent = member.name;
  const avatar = document.querySelector("#memberProfileAvatar");
  avatar.style.background = member.color;
  avatar.textContent = initials(member.name);
  document.querySelector("#memberProfileGreeting").textContent =
    member.greeting || "ひとことはまだありません。";
  memberProfileDialog.showModal();
}

function applyTheme() {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function renderAll() {
  renderMembers();
  renderCalendar();
  renderTimeline();
}

attendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(attendanceForm);
  const item = {
    status: data.get("status"),
    start: document.querySelector("#startTime").value,
    end: document.querySelector("#endTime").value,
    comment: document.querySelector("#commentInput").value.trim(),
  };
  if (!item.status) return showToast("参加ステータスを選んでください");
  try {
    await saveAttendance(item);
    await loadAttendances({ quiet: true });
    dayDialog.close();
    showToast("みんなのカレンダーに保存しました");
  } catch (error) {
    console.error(error);
    setSyncStatus("保存エラー", true);
    showToast("保存できませんでした。通信を確認してください");
  }
});

deleteAttendanceButton.addEventListener("click", async () => {
  if (!window.confirm(`${formatDay(parseDate(selectedDate))}の予定を削除しますか？`)) return;
  try {
    await deleteAttendance();
    await loadAttendances({ quiet: true });
    dayDialog.close();
    showToast("予定を削除しました");
  } catch (error) {
    console.error(error);
    setSyncStatus("削除エラー", true);
    showToast("予定を削除できませんでした");
  }
});

document.querySelector("#prevMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
  renderTimeline();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
  renderTimeline();
});

document.querySelector("#todayButton").addEventListener("click", () => {
  const now = new Date();
  visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar();
  renderTimeline();
});

document.querySelector("#prevWeek").addEventListener("click", () => {
  timelineWeekStart.setDate(timelineWeekStart.getDate() - 7);
  renderTimeline();
});

document.querySelector("#currentWeek").addEventListener("click", () => {
  timelineWeekStart = startOfWeek(new Date());
  renderTimeline();
});

document.querySelector("#nextWeek").addEventListener("click", () => {
  timelineWeekStart.setDate(timelineWeekStart.getDate() + 7);
  renderTimeline();
});

document.querySelector("#copyInvite").addEventListener("click", async () => {
  const inviteUrl = `${location.origin}${location.pathname}#invite=${api.inviteKey}`;
  try {
    await navigator.clipboard.writeText(inviteUrl);
    showToast("招待リンクをコピーしました");
  } catch {
    showToast(inviteUrl);
  }
});

document.querySelector("#themeToggle").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeKey, theme);
  applyTheme();
});

document.querySelector("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#nicknameInput").value.trim();
  const greeting = document.querySelector("#greetingInput").value.trim();
  if (!name) return;
  profile = {
    ...profile,
    name,
    greeting,
    initials: initials(name),
    color: document.querySelector("#colorInput").value,
  };
  localStorage.setItem(profileKey, JSON.stringify(profile));
  try {
    await syncProfileToAttendances();
    await loadAttendances({ quiet: true });
    showToast("プロフィールを保存しました");
  } catch (error) {
    console.error(error);
    renderMembers();
    showToast("端末には保存しました。共有更新に失敗しました");
  }
});

document.querySelector("#colorPicker").addEventListener("change", (event) => {
  updateSelectedColor(event.target.value);
});

document.querySelector("#jumpBestDay").addEventListener("click", () => {
  const best = getBestDay();
  if (best) openDay(best.key);
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
  });
});

applyTheme();
if (hasAccess) {
  renderAll();
  loadAttendances();
  window.setInterval(() => loadAttendances({ quiet: true }), 30000);
}
