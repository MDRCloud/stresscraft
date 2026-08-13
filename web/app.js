/**
 * StressCraft Dashboard — app.js
 * WebSocket telemetry, Chart.js charts, form control, presets, log, toasts.
 */

/* ── Config ── */
const WS_URL   = `ws://${location.host}/api/ws`;
const API_BASE = '/api';
const HISTORY  = 60;   // data-points kept in rolling window

/* ── State ── */
const state = {
  running: false,
  ws: null,
  reconnectTimer: null,
  prevSessions: 0,
  history: {
    sessions: new Array(HISTORY).fill(0),
    active:   new Array(HISTORY).fill(0),
    chunks:   new Array(HISTORY).fill(0),
    labels:   new Array(HISTORY).fill(''),
  }
};

/* ── DOM refs ── */
const $  = id => document.getElementById(id);
const el = {
  dot:          $('status-dot'),
  label:        $('status-label'),
  sessions:     $('metric-sessions'),
  active:       $('metric-active'),
  chunks:       $('metric-chunks'),
  rate:         $('metric-rate'),
  subSessions:  $('sub-sessions'),
  subActive:    $('sub-active'),
  subChunks:    $('sub-chunks'),
  subRate:      $('sub-rate'),
  apiKey:       $('field-api-key'),
  form:         $('start-form'),
  btnStart:     $('btn-start'),
  btnStop:      $('btn-stop'),
  logTerminal:  $('log-terminal'),
  logClear:     $('log-clear'),
  toastCont:    $('toast-container'),
};

/* ══════════════════════════════════════════════
   CHARTS
   ══════════════════════════════════════════════ */
const CHART_DEFAULTS = {
  type: 'line',
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: false }, tooltip: { displayColors: false } },
    scales: {
      x: { display: false },
      y: {
        display: true,
        min: 0,
        grid: { color: 'rgba(255,255,255,.05)' },
        ticks: { color: 'rgba(232,234,244,.4)', font: { size: 10, family: 'JetBrains Mono' }, maxTicksLimit: 5 },
        border: { display: false }
      }
    },
    elements: { point: { radius: 0 }, line: { tension: 0.4, borderWidth: 2 } }
  }
};

function makeGradient(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, color.replace(')', ', .35)').replace('rgb', 'rgba'));
  g.addColorStop(1, color.replace(')', ', .00)').replace('rgb', 'rgba'));
  return g;
}

function initCharts() {
  const ctxS = $('chart-sessions').getContext('2d');
  const ctxC = $('chart-chunks').getContext('2d');

  state.chartSessions = new Chart(ctxS, {
    ...JSON.parse(JSON.stringify(CHART_DEFAULTS)),
    data: {
      labels: state.history.labels,
      datasets: [{
        data: state.history.sessions,
        borderColor: '#00f5c4',
        backgroundColor: makeGradient(ctxS, 'rgb(0,245,196)'),
        fill: true,
      }, {
        data: state.history.active,
        borderColor: '#4ade80',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        fill: false,
      }]
    }
  });

  state.chartChunks = new Chart(ctxC, {
    ...JSON.parse(JSON.stringify(CHART_DEFAULTS)),
    data: {
      labels: state.history.labels,
      datasets: [{
        data: state.history.chunks,
        borderColor: '#a56bff',
        backgroundColor: makeGradient(ctxC, 'rgb(165,107,255)'),
        fill: true,
      }]
    }
  });
}

/* ══════════════════════════════════════════════
   TELEMETRY UPDATE
   ══════════════════════════════════════════════ */
function pushHistory(key, value) {
  state.history[key].push(value);
  state.history[key].shift();
}

function applyStats(data) {
  const { running, sessionCount = 0, activeSessions = 0, chunksLoaded = 0 } = data;

  // ── Status dot ──
  if (running !== state.running) {
    state.running = running;
    el.dot.className   = 'status-dot ' + (running ? 'running' : 'stopped');
    el.label.textContent = running ? 'Running' : 'Stopped';
    toggleButtons(running);
    log(running ? 'Stress test started.' : 'Stress test stopped.', running ? 'info' : 'warn');
  }

  // ── Metric cards ──
  const rate = sessionCount - state.prevSessions;
  state.prevSessions = sessionCount;

  animateCount(el.sessions, sessionCount);
  animateCount(el.active, activeSessions);
  animateCount(el.chunks, chunksLoaded);
  animateCount(el.rate, Math.max(0, rate));

  el.subSessions.textContent = running ? `target: ${currentFormValue('count')}` : '—';
  el.subActive.textContent   = activeSessions ? `${((activeSessions/sessionCount)*100).toFixed(1)}% active` : '—';
  el.subChunks.textContent   = chunksLoaded ? `~${(chunksLoaded/Math.max(1,activeSessions)).toFixed(1)} / bot` : '—';
  el.subRate.textContent     = rate > 0 ? `+${rate} this second` : '—';

  // ── History ──
  const now = new Date().toLocaleTimeString();
  pushHistory('sessions', sessionCount);
  pushHistory('active', activeSessions);
  pushHistory('chunks', chunksLoaded);
  pushHistory('labels', now);

  // ── Charts ──
  state.chartSessions.data.datasets[0].data = [...state.history.sessions];
  state.chartSessions.data.datasets[1].data = [...state.history.active];
  state.chartSessions.data.labels           = [...state.history.labels];
  state.chartSessions.update('none');

  state.chartChunks.data.datasets[0].data  = [...state.history.chunks];
  state.chartChunks.data.labels             = [...state.history.labels];
  state.chartChunks.update('none');
}

let countAnimReqs = {};
function animateCount(el, target) {
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  el.classList.remove('metric-pop');
  void el.offsetWidth;  // reflow to restart animation
  el.classList.add('metric-pop');
  el.textContent = target.toLocaleString();
}

function currentFormValue(name) {
  const f = el.form.elements.namedItem(name);
  return f ? f.value : '?';
}

/* ══════════════════════════════════════════════
   WEBSOCKET
   ══════════════════════════════════════════════ */
function connectWS() {
  if (state.ws) return;

  try {
    const ws = new WebSocket(WS_URL);
    state.ws = ws;

    ws.onopen = () => {
      log('WebSocket connected.', 'muted');
      clearTimeout(state.reconnectTimer);
    };

    ws.onmessage = ({ data }) => {
      try { applyStats(JSON.parse(data)); } catch (_) {}
    };

    ws.onclose = () => {
      state.ws = null;
      log('WebSocket disconnected — reconnecting in 3 s…', 'warn');
      el.dot.className = 'status-dot';
      state.reconnectTimer = setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  } catch (_) {
    state.reconnectTimer = setTimeout(connectWS, 5000);
  }
}

/* ══════════════════════════════════════════════
   START / STOP
   ══════════════════════════════════════════════ */
/* ── API key persistence ── */
const API_KEY_STORAGE = 'stresscraft.apiKey';
el.apiKey.value = localStorage.getItem(API_KEY_STORAGE) || '';
el.apiKey.addEventListener('input', () => {
  localStorage.setItem(API_KEY_STORAGE, el.apiKey.value);
});

function authHeaders() {
  return el.apiKey.value ? { 'X-API-Key': el.apiKey.value } : {};
}

async function handleAuthError(res) {
  if (res.status === 401) {
    toast('Invalid or missing API key', 'error');
    log('Request rejected: invalid or missing API key.', 'error');
    return true;
  }
  return false;
}

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!el.form.checkValidity()) { el.form.reportValidity(); return; }

  el.btnStart.disabled = true;
  const body = new URLSearchParams(new FormData(el.form));
  body.delete('apiKey');

  try {
    const res = await fetch(`${API_BASE}/start`, { method: 'POST', body, headers: authHeaders() });
    if (res.ok) {
      toast('Stress test started!', 'success');
      log(`Starting test → ${currentFormValue('host')}:${currentFormValue('port')} with ${currentFormValue('count')} bots`, 'info');
    } else if (!(await handleAuthError(res))) {
      const msg = await res.text();
      toast(`Error: ${msg}`, 'error');
      log(`Start failed: ${msg}`, 'error');
      el.btnStart.disabled = false;
    } else {
      el.btnStart.disabled = false;
    }
  } catch (_) {
    toast('Network error', 'error');
    el.btnStart.disabled = false;
  }
});

$('btn-stop').addEventListener('click', async () => {
  el.btnStop.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/stop`, { method: 'POST', headers: authHeaders() });
    if (res.ok) {
      toast('Test stopped.', 'info');
    } else if (!(await handleAuthError(res))) {
      const msg = await res.text();
      toast(`Error: ${msg}`, 'error');
      el.btnStop.disabled = false;
    } else {
      el.btnStop.disabled = false;
    }
  } catch (_) {
    toast('Network error', 'error');
    el.btnStop.disabled = false;
  }
});

function toggleButtons(running) {
  el.btnStart.disabled = running;
  el.btnStop.disabled  = !running;
}

/* ══════════════════════════════════════════════
   PRESETS
   ══════════════════════════════════════════════ */
const PRESETS = {
  light:   { count: 25,  delay: 100, buffer: 10, prefix: 'Lite' },
  medium:  { count: 150, delay: 30,  buffer: 20, prefix: 'Bot'  },
  extreme: { count: 500, delay: 5,   buffer: 50, prefix: 'Doom' },
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    Object.entries(preset).forEach(([k, v]) => {
      const inp = el.form.elements.namedItem(k);
      if (inp) inp.value = v;
    });
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    log(`Preset loaded: ${btn.dataset.preset}`, 'muted');
  });
});

/* ── Localhost Docker warning ── */
const hostInput   = $('field-host');
const hintLochost = $('hint-localhost');

function checkLocalhostHint() {
  const v = hostInput.value.trim().toLowerCase();
  const isLocal = v === 'localhost' || v === '127.0.0.1' || v === '::1';
  hintLochost.hidden = !isLocal;
}

hostInput.addEventListener('input', checkLocalhostHint);
checkLocalhostHint(); // run on load

/* ══════════════════════════════════════════════
   LOG TERMINAL
   ══════════════════════════════════════════════ */
function log(msg, level = 'muted') {
  const time  = new Date().toLocaleTimeString();
  const line  = document.createElement('span');
  line.className = `log-line log-line--${level}`;
  line.innerHTML = `<span class="log-line__time">[${time}]</span>${escapeHtml(msg)}`;
  el.logTerminal.appendChild(line);
  el.logTerminal.scrollTop = el.logTerminal.scrollHeight;
}

el.logClear.addEventListener('click', () => {
  el.logTerminal.innerHTML = '';
  log('Log cleared.', 'muted');
});

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ══════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  const icon = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' }[type] || '';
  t.innerHTML = `<span>${icon}</span><span>${escapeHtml(msg)}</span>`;
  el.toastCont.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast--out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 3500);
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  connectWS();
  log('StressCraft dashboard loaded.', 'muted');
  log('⚠️  Only target servers you own!', 'warn');
});
