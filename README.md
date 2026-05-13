# 8x8 → Zendesk Integration Simulator

A browser-based agent dashboard that simulates the integration between
**8x8** (voice/communication platform) and **Zendesk** (ticketing system) —
where an inbound call automatically triggers ticket creation, with every
integration step logged in real time.

[Watch Demo Video](https://drive.google.com/file/d/1argp2Fxxgs-8NRuDg1HkkqA9USlF2lA2/view?usp=sharing)

---

## The Problem

In CX environments that use 8x8 for voice and Zendesk for ticketing, agents
typically have to manually create a ticket every time they answer a call.
This is slow, inconsistent, and creates data gaps when agents forget.

A real integration between 8x8 and Zendesk solves this by firing an event
the moment a call is answered — automatically creating a pre-populated ticket
with the caller's details, priority, and issue type. This simulator
demonstrates exactly that flow.

---

## How It Works

```
Inbound call arrives (8x8 event)
        ↓
Agent clicks "Answer"
        ↓
App fires POST request → Zendesk API
        ↓
Zendesk creates ticket (#ID assigned)
        ↓
Ticket appears in live feed
        ↓
Every step logged with timestamp
```

---

## Features

- **Simulated 8x8 call queue** — inbound calls appear with caller name,
  number, issue type, priority, and a live wait timer
- **Real Zendesk API integration** — answering a call POSTs to
  `POST /api/v2/tickets.json` and creates an actual ticket in your account
- **Demo mode** — runs with simulated API responses when no credentials
  are set, so it works immediately out of the box
- **Live event log** — every integration step is timestamped and logged
  (call received → API called → ticket created → feed updated)
- **Priority classification** — calls are tagged urgent / high / normal / low
  and passed through to the Zendesk ticket

---

## Run It

No install needed. Just open `index.html` in your browser.

Works immediately in **Demo Mode** — simulated API calls, no credentials needed.

---

## Connect to Real Zendesk

Open `app.js` and fill in the three lines at the top:

```javascript
const CONFIG = {
  subdomain: 'your-subdomain',    // from your-subdomain.zendesk.com
  email:     'you@email.com',     // your Zendesk login email
  apiToken:  'your_token_here',   // Admin > Apps & Integrations > APIs
};
```

Once filled in, the simulator makes real API calls — tickets created here
will appear live in your Zendesk account.

---

## Project Structure

```
8x8-zendesk-sim/
├── index.html    ← dashboard layout (call queue, ticket feed, event log)
├── style.css     ← dark-mode agent dashboard styling
├── app.js        ← call simulation, Zendesk API calls, event logging
└── README.md
```

---

## What This Demonstrates

- Understanding of the 8x8 → Zendesk integration pattern used in CX operations
- Cross-platform event flow: a call event on one platform triggers an action on another
- REST API calls with token authentication from a browser client
- Demo/live mode fallback — the same pattern used in production tooling
- Real-time UI updates driven by async API responses
- The kind of integration an Automation & Integration Engineer builds and maintains

---

## Production Context

In a real deployment, this integration would be orchestrated differently:

- **8x8** fires a webhook on call answer to an internal endpoint
- A **Python script or n8n workflow** receives the webhook and calls the Zendesk API
- This removes the need for credentials in browser code and adds retry/audit logic

This simulator demonstrates the same data flow and API integration pattern
in a portable, runnable format without requiring server infrastructure.

---

## Author

**Jay Magayanes** · [github.com/jaymagayanes](https://github.com/jaymagayanes) · magayanesjesh@gmail.com
