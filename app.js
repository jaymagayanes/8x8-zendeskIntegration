// ─────────────────────────────────────────────────────
// 8x8 → Zendesk Integration Simulator
// Author: Jay Magayanes
//
// HOW IT WORKS:
//   1. Simulates inbound 8x8 call events
//   2. Agent clicks "Answer"
//   3. App POSTs to Zendesk API → creates real ticket
//   4. Ticket appears in the live feed
//   5. Every step is logged in the event log
// ─────────────────────────────────────────────────────

// ── CONFIG ─────────────────────────────────────────
// Fill in your Zendesk trial credentials here.
// Leave empty to run in DEMO MODE (no real API calls).
const CONFIG = {
  subdomain: 'cambridgepressassessment',
  email:     'jmagayanes.cambridge@gmail.com',
  apiToken:  'R48mo0VqIEKSIdbdinE14ZMscOBRW6aj797VosRs',        
};
// ────────────────────────────────────────────────────

// ── STATE ───────────────────────────────────────────
let callQueue   = [];
let ticketCount = 0;
let callIdSeq   = 1;

// ── MOCK CALLERS ────────────────────────────────────
// Simulates the kind of caller data 8x8 would pass
// along with an inbound call event.
const MOCK_CALLERS = [
  { name: 'Maria Santos',    number: '+63 917 123 4567', issue: 'Unable to access school portal after password reset',   priority: 'high'   },
  { name: 'James Alcantara', number: '+63 920 234 5678', issue: 'Integration not syncing between systems',                priority: 'urgent' },
  { name: 'Ana Reyes',       number: '+63 915 345 6789', issue: 'Billing discrepancy on last invoice',                   priority: 'normal' },
  { name: 'Carlos Mendoza',  number: '+63 918 456 7890', issue: 'Feature request: bulk data export',                     priority: 'low'    },
  { name: 'Elena Cruz',      number: '+63 921 567 8901', issue: 'API returning 401 errors on all authenticated calls',   priority: 'urgent' },
  { name: 'Robert Tan',      number: '+63 916 678 9012', issue: 'Duplicate charge on account — needs urgent review',     priority: 'high'   },
  { name: 'Sofia Villanueva',number: '+63 919 789 0123', issue: 'SSO login failing for newly registered users',          priority: 'high'   },
  { name: 'Miguel Ramos',    number: '+63 922 890 1234', issue: 'Report showing wrong date range in dashboard',          priority: 'normal' },
];

// ── UTILITIES ───────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function log(msg, type = 'info') {
  const body = document.getElementById('logBody');
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.innerHTML = `<span class="log-time">${now()}</span><span class="log-msg">${msg}</span>`;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function setConnStatus(state, label) {
  const el = document.getElementById('connStatus');
  el.className = `conn-status ${state}`;
  document.getElementById('connLabel').textContent = label;
}

function updateQueueBadge() {
  const active = callQueue.filter(c => !c.answered).length;
  document.getElementById('queueCount').textContent = active;
}

function updateTicketBadge() {
  document.getElementById('ticketCount').textContent = ticketCount;
}

// ── CHECK CONFIG ────────────────────────────────────
function isConfigured() {
  return CONFIG.email.trim() !== '' && CONFIG.apiToken.trim() !== '';
}

// ── SIMULATE INCOMING CALL ──────────────────────────
function simulateCall() {
  const caller = MOCK_CALLERS[Math.floor(Math.random() * MOCK_CALLERS.length)];
  const callId = `CALL-${String(callIdSeq++).padStart(3, '0')}`;

  const call = { id: callId, ...caller, answered: false, startTime: Date.now() };
  callQueue.push(call);

  // Hide empty state if first call
  const empty = document.getElementById('emptyQueue');
  if (empty) empty.style.display = 'none';

  renderCallCard(call);
  updateQueueBadge();

  log(`[8x8] Inbound call received → ${callId} from ${caller.name} (${caller.number})`, 'action');
  log(`[8x8] Call queued. Priority assessed: ${caller.priority.toUpperCase()}`, 'info');
}

// ── RENDER CALL CARD ────────────────────────────────
function renderCallCard(call) {
  const list = document.getElementById('callList');

  const card = document.createElement('div');
  card.className = 'call-card';
  card.id = `call-${call.id}`;

  card.innerHTML = `
    <div class="call-top">
      <div>
        <div class="caller-name">${call.name}</div>
        <div class="caller-num">${call.number}</div>
      </div>
      <span class="wait-time" id="wait-${call.id}">0:00</span>
    </div>
    <div class="call-issue">${call.issue}</div>
    <div class="call-footer">
      <span class="priority-tag ${call.priority}">${call.priority}</span>
      <button class="btn-answer" onclick="answerCall('${call.id}')">Answer</button>
    </div>
  `;

  list.appendChild(card);

  // Live wait timer
  const waitEl = document.getElementById(`wait-${call.id}`);
  const timer = setInterval(() => {
    if (call.answered) { clearInterval(timer); return; }
    const secs = Math.floor((Date.now() - call.startTime) / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    waitEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

// ── ANSWER CALL ─────────────────────────────────────
async function answerCall(callId) {
  const call = callQueue.find(c => c.id === callId);
  if (!call || call.answered) return;

  call.answered = true;

  // Update card UI
  const card = document.getElementById(`call-${callId}`);
  card.classList.add('answered');
  card.querySelector('.btn-answer').disabled = true;
  card.querySelector('.btn-answer').textContent = 'Answered';

  updateQueueBadge();

  const waitSecs = Math.floor((Date.now() - call.startTime) / 1000);
  log(`[Agent] Call answered → ${callId} (waited ${waitSecs}s)`, 'success');
  log(`[System] Triggering Zendesk ticket creation…`, 'action');

  // Create the Zendesk ticket
  await createZendeskTicket(call);
}

// ── CREATE ZENDESK TICKET ───────────────────────────
async function createZendeskTicket(call) {

  const ticketPayload = {
    ticket: {
      subject:     `[${call.priority.toUpperCase()}] ${call.issue}`,
      comment:     { body: `Ticket auto-created from inbound 8x8 call.\n\nCaller: ${call.name}\nPhone:  ${call.number}\nIssue:  ${call.issue}\nCall ID: ${call.id}` },
      priority:    call.priority,
      tags:        ['8x8-integration', 'auto-created', call.priority],
    }
  };

  // ── DEMO MODE (no credentials) ──────────────────
  if (!isConfigured()) {
    log(`[DEMO] No credentials set — simulating API call…`, 'warn');
    await sleep(900);
    log(`[DEMO] POST https://${CONFIG.subdomain}.zendesk.com/api/v2/tickets.json`, 'info');
    await sleep(600);

    const fakeId = 3100000 + Math.floor(Math.random() * 9999);
    log(`[DEMO] Zendesk responded → 201 Created | Ticket #${fakeId}`, 'success');
    renderTicketCard(call, fakeId, true);
    return;
  }

  // ── LIVE MODE (real API call) ───────────────────
  try {
    log(`[API] POST → https://${CONFIG.subdomain}.zendesk.com/api/v2/tickets.json`, 'action');

    const credentials = btoa(`${CONFIG.email}/token:${CONFIG.apiToken}`);

    const response = await fetch(
      `https://${CONFIG.subdomain}.zendesk.com/api/v2/tickets.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify(ticketPayload),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status} — ${err.description || 'Unknown error'}`);
    }

    const data   = await response.json();
    const ticket = data.ticket;

    log(`[API] Zendesk responded → 201 Created`, 'success');
    log(`[API] Ticket #${ticket.id} created | Priority: ${ticket.priority} | Status: ${ticket.status}`, 'success');

    renderTicketCard(call, ticket.id, false);

  } catch (err) {
    log(`[ERROR] Zendesk API call failed: ${err.message}`, 'error');
    log(`[Fallback] Rendering ticket in demo mode`, 'warn');

    const fakeId = 3100000 + Math.floor(Math.random() * 9999);
    renderTicketCard(call, fakeId, true);
  }
}

// ── RENDER TICKET CARD ──────────────────────────────
function renderTicketCard(call, ticketId, isDemo) {
  ticketCount++;
  updateTicketBadge();

  const list = document.getElementById('ticketList');

  // Remove empty state
  const empty = list.querySelector('.empty-tickets');
  if (empty) empty.remove();

  const card = document.createElement('div');
  card.className = 'ticket-card';
  card.innerHTML = `
    <div class="ticket-id-block">
      <span class="ticket-id">#${ticketId}</span>
    </div>
    <div class="ticket-info">
      <div class="ticket-subject">${call.issue}</div>
      <div class="ticket-meta">
        <span>👤 ${call.name}</span>
        <span>📞 ${call.number}</span>
        <span>🔗 ${call.id}</span>
        ${isDemo ? '<span style="color:var(--amber)">[DEMO]</span>' : ''}
      </div>
    </div>
    <span class="ticket-status priority-tag ${call.priority}">${call.priority}</span>
  `;

  list.prepend(card);
  log(`[Feed] Ticket #${ticketId} added to live feed`, 'success');
}

// ── CLEAR LOG ───────────────────────────────────────
function clearLog() {
  document.getElementById('logBody').innerHTML = '';
  log('Log cleared.', 'info');
}

// ── SLEEP UTILITY ───────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── INIT ────────────────────────────────────────────
(function init() {
  if (isConfigured()) {
    setConnStatus('live', 'Connected to Zendesk');
    log('[System] Credentials found — live Zendesk API active.', 'success');
  } else {
    setConnStatus('', 'Demo Mode');
    log('[System] No credentials set — running in DEMO MODE.', 'warn');
    log('[System] Fill in CONFIG.email and CONFIG.apiToken in app.js to go live.', 'info');
  }

  log('[8x8] Voice channel ready. Listening for inbound calls…', 'success');

  // Auto-simulate a call after 3 seconds so it doesn't look empty
  setTimeout(simulateCall, 3000);
})();
