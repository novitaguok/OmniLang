/**
 * Self-contained HTML/CSS/JS views for the OmniLang Interactive Demo Studio (/demo),
 * Public Global Catalog page (/p/:listingId), and Cross-Border Checkout page (/pay/:invoiceId).
 *
 * The /demo studio auto-starts immediately on page load (zero user clicks required)
 * and choreographs the complete 2:45 demonstration with live typewriter input animations,
 * real backend API calls (plus an automatic in-browser fallback if opened via file://),
 * Dialogflow CX state transitions, and synchronized teleprompter captions.
 */

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCatalogPageHtml(listing: Record<string, unknown>, merchantName: string): string {
  const title = escapeHtml(listing.title);
  const description = escapeHtml(listing.description);
  const basePrice = listing.basePrice as { amount: number; currency: string } | undefined;
  const conversions = (listing.priceConversions as Array<{ amount: number; currency: string }> | undefined) ?? [];
  const tags = (listing.tags as string[] | undefined) ?? [];
  const materials = (listing.materials as string[] | undefined) ?? [];
  const colors = (listing.colors as string[] | undefined) ?? [];
  const care = escapeHtml(listing.careInstructions ?? 'Hand wash cold, dry in shade.');
  const dims = escapeHtml(listing.estimatedDimensions ?? 'Standard artisan dimensions');
  const craft = escapeHtml(listing.craftsmanshipNotes ?? 'Handcrafted by local micro-SME artisan.');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} — OmniLang Global Catalog</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b1020; color: #f1f5f9; display: flex; justify-content: center; padding: 32px 16px;
    }
    .card {
      max-width: 720px; width: 100%; background: #131c31; border: 1px solid #263554;
      border-radius: 20px; padding: 28px; box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }
    .badge {
      display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 999px; padding: 4px 12px;
      font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
    }
    h1 { margin: 12px 0 8px; font-size: 26px; color: #fff; }
    .merchant { color: #94a3b8; font-size: 14px; margin-bottom: 18px; }
    .prices {
      display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      background: #0f172a; padding: 14px 18px; border-radius: 14px; border: 1px solid #1e293b;
      margin-bottom: 20px;
    }
    .base-price { font-size: 24px; font-weight: 700; color: #38bdf8; margin-right: 10px; }
    .fx-pill {
      background: #1e293b; color: #e2e8f0; padding: 5px 11px; border-radius: 8px; font-size: 13px; font-weight: 600;
    }
    .desc { line-height: 1.65; color: #cbd5e1; font-size: 15px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .meta-box { background: #0f172a; padding: 12px 14px; border-radius: 12px; border: 1px solid #1e293b; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
    .meta-val { font-size: 13px; color: #e2e8f0; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .tag { background: rgba(56, 189, 248, 0.12); color: #7dd3fc; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">✨ Gemini 2.5 Flash Verified Listing</span>
    <h1>${title}</h1>
    <div class="merchant">Crafted by <strong>${escapeHtml(merchantName)}</strong> · Verified JAPAC Micro-SME</div>
    <div class="prices">
      <span class="base-price">${escapeHtml(basePrice?.currency)} ${Number(basePrice?.amount ?? 0).toLocaleString()}</span>
      ${conversions.map((c) => `<span class="fx-pill">≈ ${escapeHtml(c.currency)} ${Number(c.amount).toLocaleString()}</span>`).join('')}
    </div>
    <p class="desc">${description}</p>
    <div class="grid">
      <div class="meta-box"><div class="meta-label">Materials</div><div class="meta-val">${escapeHtml(materials.join(', '))}</div></div>
      <div class="meta-box"><div class="meta-label">Color Palette</div><div class="meta-val">${escapeHtml(colors.join(', '))}</div></div>
      <div class="meta-box"><div class="meta-label">Dimensions</div><div class="meta-val">${dims}</div></div>
      <div class="meta-box"><div class="meta-label">Care Instructions</div><div class="meta-val">${care}</div></div>
    </div>
    <div class="meta-box"><div class="meta-label">Craftsmanship Notes</div><div class="meta-val">${craft}</div></div>
    <div class="tags">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>
  </div>
</body>
</html>`;
}

export function renderPaymentPageHtml(invoiceId: string, order: Record<string, unknown> | null): string {
  const total = order?.total as { amount: number; currency: string } | undefined;
  const qty = order?.quantity ?? 1;
  const negotiationId = escapeHtml(order?.negotiationId ?? '');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>OmniLang Cross-Border Checkout — ${escapeHtml(invoiceId)}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b1020; color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px;
    }
    .card {
      max-width: 460px; width: 100%; background: #131c31; border: 1px solid #263554;
      border-radius: 20px; padding: 28px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }
    .amount { font-size: 32px; font-weight: 800; color: #34d399; margin: 16px 0; }
    .meta { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
    button {
      background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none;
      padding: 12px 24px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%;
    }
    .done { margin-top: 14px; color: #38bdf8; font-size: 14px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:12px;color:#38bdf8;font-weight:700;text-transform:uppercase;">OmniLang Escrow & Cross-Border Pay</div>
    <h2 style="margin:8px 0 4px;">Invoice ${escapeHtml(invoiceId.slice(0, 18))}</h2>
    <div class="amount">${total ? `${escapeHtml(total.currency)} ${Number(total.amount).toLocaleString()}` : 'Cross-Border Order'}</div>
    <div class="meta">Quantity: ${escapeHtml(qty)} units · Protected Artisan Escrow</div>
    ${
      negotiationId
        ? `<button id="payBtn" onclick="payNow('${negotiationId}')">💳 Complete Cross-Border Payment</button>
           <div id="doneMsg" class="done">✅ Payment settled! Dialogflow CX state advanced to PAID.</div>`
        : `<div class="meta">Invoice ready for buyer settlement.</div>`
    }
  </div>
  <script>
    async function payNow(negId) {
      const btn = document.getElementById('payBtn');
      btn.disabled = true;
      btn.textContent = 'Processing...';
      await fetch('/api/demo/negotiations/' + encodeURIComponent(negId) + '/pay', { method: 'POST' });
      btn.style.display = 'none';
      document.getElementById('doneMsg').style.display = 'block';
    }
  </script>
</body>
</html>`;
}

export function renderDemoStudioHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>OmniLang SME Commerce Agent — Hands-Free 2:45 Auto-Play Demo</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #070b16;
      --panel: #0f172a;
      --panel-alt: #131e36;
      --border: #1e293b;
      --border-hi: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --emerald: #10b981;
      --amber: #f59e0b;
      --wa-bg: #0b141a;
      --wa-header: #202c33;
      --wa-out: #005c4b;
      --wa-in: #202c33;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(circle at 15% 0%, #0f2447 0%, var(--bg) 55%);
      color: var(--text);
      height: 100vh;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      overflow: hidden;
    }

    /* Progress Bar across very top */
    .progress-track {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255,255,255,0.06);
      z-index: 100;
    }
    .progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #10b981, #38bdf8, #a855f7);
      transition: width 0.5s linear;
    }

    /* Top Director Header */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: rgba(15, 23, 42, 0.92);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(12px);
      gap: 12px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981, #38bdf8);
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 18px;
      color: #06131f;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
    }
    .brand-title {
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .live-dot {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      animation: blinkDot 1.4s infinite;
    }
    @keyframes blinkDot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    .brand-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .stack-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .stack-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.28);
      color: #bae6fd;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .stack-pill.active {
      background: rgba(16, 185, 129, 0.24);
      border-color: #10b981;
      color: #6ee7b7;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }

    .director-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .director-status {
      font-size: 11px;
      font-weight: 700;
      padding: 5px 11px;
      border-radius: 8px;
      background: rgba(56, 189, 248, 0.14);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #7dd3fc;
    }
    .timer-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #090d18;
      border: 1px solid var(--border-hi);
      padding: 5px 12px;
      border-radius: 10px;
      font-variant-numeric: tabular-nums;
      font-size: 13px;
      font-weight: 700;
    }
    .timer-safe {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-weight: 700;
    }
    .btn {
      border: 1px solid var(--border-hi);
      background: #1e293b;
      color: var(--text);
      padding: 6px 11px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .btn:hover { background: #334155; }
    .btn-primary {
      background: linear-gradient(135deg, #10b981, #0284c7);
      border-color: #38bdf8;
      color: #fff;
    }
    .btn-amber {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-color: #fbbf24;
      color: #090d16;
    }
    .pulse-action {
      animation: pulseRing 0.7s ease-in-out 2;
      box-shadow: 0 0 22px #38bdf8 !important;
      transform: scale(1.05);
    }
    @keyframes pulseRing {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.07); }
    }

    /* Scene Stepper Bar */
    .scene-bar {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      padding: 7px 20px;
      background: rgba(11, 17, 32, 0.9);
      border-bottom: 1px solid var(--border);
    }
    .scene-tab {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 6px 10px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .scene-tab.active {
      background: rgba(16, 185, 129, 0.16);
      border-color: #10b981;
      box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.45);
    }
    .scene-time {
      font-size: 10px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .scene-name {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Main 3-Column Stage */
    .stage {
      display: grid;
      grid-template-columns: 355px 1fr 355px;
      gap: 14px;
      padding: 10px 20px;
      overflow: hidden;
      min-height: 0;
    }

    /* Phone Simulator Columns */
    .phone {
      background: var(--wa-bg);
      border: 2px solid #26354a;
      border-radius: 22px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5);
      min-height: 0;
      transition: all 0.25s ease;
    }
    .phone.highlight {
      border-color: #10b981;
      box-shadow: 0 0 28px rgba(16, 185, 129, 0.38);
    }
    .phone-header {
      background: var(--wa-header);
      padding: 10px 14px;
      border-bottom: 1px solid #2f3b43;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .phone-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .phone-role {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .role-merchant { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .role-buyer { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .phone-select {
      width: 100%;
      background: #111b21;
      color: #e9edef;
      border: 1px solid #2a3942;
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .chat-feed {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 9px;
      background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0);
      background-size: 18px 18px;
    }
    .bubble {
      max-width: 90%;
      padding: 8px 11px;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
      position: relative;
      animation: popIn 0.22s ease-out;
    }
    @keyframes popIn {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .bubble.sent {
      align-self: flex-end;
      background: var(--wa-out);
      color: #e9edef;
      border-bottom-right-radius: 3px;
    }
    .bubble.received {
      align-self: flex-start;
      background: var(--wa-in);
      color: #e9edef;
      border-bottom-left-radius: 3px;
      border: 1px solid #2f3b43;
    }
    .bubble-meta {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.65);
      margin-bottom: 3px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      gap: 6px;
    }
    .bubble-photo {
      width: 100%;
      height: 88px;
      border-radius: 8px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.85);
      border: 1px solid rgba(255,255,255,0.22);
    }
    .phone-composer {
      background: var(--wa-header);
      padding: 8px 10px;
      border-top: 1px solid #2f3b43;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .preset-row {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }
    .preset-chip {
      font-size: 10px;
      background: #111b21;
      color: #93c5fd;
      border: 1px solid #2a3942;
      border-radius: 6px;
      padding: 3px 7px;
      cursor: pointer;
      font-weight: 600;
    }
    .composer-input-row {
      display: flex;
      gap: 6px;
    }
    .composer-input {
      flex: 1;
      background: #2a3942;
      color: #fff;
      border: 1px solid #3b4a54;
      border-radius: 8px;
      padding: 6px 9px;
      font-size: 12px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .composer-input.typing {
      border-color: #38bdf8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.45);
    }

    /* Center Intelligence Hub */
    .hub {
      display: flex;
      flex-direction: column;
      gap: 9px;
      overflow-y: auto;
      min-height: 0;
      padding-right: 4px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 11px 14px;
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .card.spotlight {
      border-color: #38bdf8;
      box-shadow: 0 0 22px rgba(56, 189, 248, 0.22);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .card-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Dialogflow CX State Machine Track */
    .state-track {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }
    .state-node {
      background: #090e1a;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 5px;
      text-align: center;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--muted);
      transition: all 0.25s ease;
    }
    .state-node.done {
      border-color: rgba(16, 185, 129, 0.55);
      color: #6ee7b7;
      background: rgba(16, 185, 129, 0.1);
    }
    .state-node.current {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.22);
      color: #fff;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
      transform: scale(1.03);
    }

    /* Listing Catalog Card */
    .catalog-card {
      display: grid;
      grid-template-columns: 112px 1fr;
      gap: 12px;
      align-items: start;
    }
    .craft-thumb {
      width: 112px;
      height: 112px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.18);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 8px;
      font-size: 10.5px;
      font-weight: 800;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.85);
    }
    .fx-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 5px 0;
    }
    .fx-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: #1e293b;
      color: #7dd3fc;
      border: 1px solid #334155;
    }
    .fx-badge.primary {
      background: rgba(16, 185, 129, 0.16);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 5px;
    }
    .tag-pill {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.12);
      color: #cbd5e1;
    }

    /* Deal Closing & API Log */
    .deal-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr) auto;
      gap: 6px;
      align-items: end;
    }
    .field-label {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 2px;
      display: block;
      font-weight: 600;
    }
    .field-input {
      width: 100%;
      background: #090e1a;
      border: 1px solid var(--border-hi);
      color: #fff;
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .api-log {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 10.5px;
      background: #060913;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 7px 10px;
      max-height: 92px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .log-entry {
      color: #94a3b8;
      display: flex;
      gap: 8px;
    }
    .log-method { color: #34d399; font-weight: 700; }
    .log-status { color: #38bdf8; font-weight: 700; }

    /* Teleprompter Footer */
    .teleprompter {
      background: linear-gradient(90deg, rgba(15, 23, 42, 0.98), rgba(19, 30, 54, 0.98));
      border-top: 1px solid #334155;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .script-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.16);
      color: #38bdf8;
      white-space: nowrap;
    }
    .script-text {
      flex: 1;
      font-size: 13.5px;
      line-height: 1.42;
      color: #f1f5f9;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="progress-track"><div id="progressFill" class="progress-fill"></div></div>

  <!-- Top Director Bar -->
  <header class="topbar">
    <div class="brand">
      <div class="brand-logo">🌐</div>
      <div>
        <div class="brand-title">
          <span>OmniLang SME Commerce Agent</span>
          <span id="liveBadge" class="live-dot">● AUTO-PLAYING LIVE</span>
        </div>
        <div class="brand-sub">Multimodal &amp; Multilingual Conversational Commerce for JAPAC Micro-SMEs</div>
      </div>
    </div>

    <div class="stack-pills">
      <span id="pill-gemini" class="stack-pill">✨ Gemini 2.5 Flash (Vision Cataloger)</span>
      <span id="pill-vertex" class="stack-pill">🌏 Vertex AI Translation (ID · TL · HI · JA)</span>
      <span id="pill-dfcx" class="stack-pill">🔁 Dialogflow CX (Negotiation State Machine)</span>
      <span id="pill-cloudrun" class="stack-pill active">☁️ Cloud Run + Firestore</span>
    </div>

    <div class="director-controls">
      <span id="directorAction" class="director-status">🎬 Auto-Director Initializing...</span>
      <div class="timer-box">
        <span>⏱</span>
        <span id="timerDisplay">00:00 / 02:45</span>
        <span class="timer-safe">&lt; 3:00 CAP</span>
      </div>
      <button id="btnAutoPlay" class="btn btn-primary" onclick="toggleAutoPlay()">⏹ Playing</button>
      <button id="btnTts" class="btn" onclick="toggleVoiceover()">🔊 Voiceover: ON</button>
      <button class="btn" onclick="restartAutoPlay()">↺ Replay</button>
    </div>
  </header>

  <!-- 5-Scene Storyboard Bar -->
  <nav class="scene-bar">
    <button id="tab-1" class="scene-tab active" onclick="jumpToScene(1)">
      <span class="scene-time">Scene 1 · 0:00–0:15</span>
      <span class="scene-name">1. JAPAC Problem &amp; Cloud Stack</span>
    </button>
    <button id="tab-2" class="scene-tab" onclick="jumpToScene(2)">
      <span class="scene-time">Scene 2 · 0:15–0:46</span>
      <span class="scene-name">2. Photo → SEO Catalog (Gemini 2.5)</span>
    </button>
    <button id="tab-3" class="scene-tab" onclick="jumpToScene(3)">
      <span class="scene-time">Scene 3 · 0:46–1:36</span>
      <span class="scene-name">3. Dialect Bridge (Bahasa ⇄ Japanese)</span>
    </button>
    <button id="tab-4" class="scene-tab" onclick="jumpToScene(4)">
      <span class="scene-time">Scene 4 · 1:36–2:05</span>
      <span class="scene-name">4. Order Closing &amp; FX Invoice</span>
    </button>
    <button id="tab-5" class="scene-tab" onclick="jumpToScene(5)">
      <span class="scene-time">Scene 5 · 2:05–2:45</span>
      <span class="scene-name">5. Tagalog &amp; Hindi + Global Scale</span>
    </button>
  </nav>

  <!-- Main 3-Column Live Stage -->
  <main class="stage">
    <!-- Left Column: Merchant WhatsApp Simulator -->
    <section id="merchantPhone" class="phone">
      <div class="phone-header">
        <div class="phone-header-top">
          <span class="phone-role role-merchant">📱 Merchant WhatsApp Business</span>
          <span id="merchantLangBadge" style="font-size:11px;color:#34d399;font-weight:700;">ID · IDR</span>
        </div>
        <select id="merchantSelect" class="phone-select" onchange="onMerchantChange()">
          <option value="m-001">🇮🇩 Warung Sari Batik (Pekalongan · Bahasa · IDR)</option>
          <option value="m-002">🇵🇭 Tindahan ni Aling Rosa (Ilocos · Tagalog · PHP)</option>
          <option value="m-003">🇮🇳 Jaipur Kala Studio (Rajasthan · Hindi · INR)</option>
        </select>
      </div>

      <div id="merchantFeed" class="chat-feed"></div>

      <div class="phone-composer">
        <div class="preset-row">
          <button id="btnSnapPhoto" class="preset-chip" onclick="sendMerchantCatalogPhoto()">📸 1. Snap Photo + Price Note</button>
          <button id="btnMerchantReply" class="preset-chip" onclick="sendMerchantPresetReply()">💬 2. Send Dialect Offer + EMS Quote</button>
        </div>
        <div class="composer-input-row">
          <input id="merchantInput" class="composer-input" placeholder="Merchant dialect note or reply..." />
          <button id="btnMerchantSend" class="btn btn-primary" onclick="sendMerchantCustom()">Send</button>
        </div>
      </div>
    </section>

    <!-- Center Column: Google Cloud AI Pipeline & Global Marketplace Inspector -->
    <section class="hub">
      <!-- Problem & Scale Context Banner -->
      <div id="storyCard" class="card spotlight" style="background:linear-gradient(135deg,#111c35,#0f172a);">
        <div class="card-header" style="margin-bottom:4px;">
          <span id="storyTitle" class="card-title" style="color:#38bdf8;">🌏 The Local JAPAC Problem → Global AI Solution</span>
          <span id="storyBadge" class="fx-badge primary">Google Cloud AI Stack</span>
        </div>
        <div id="storyBody" style="font-size:12px;color:#cbd5e1;line-height:1.48;">
          <strong>70M+ JAPAC Micro-SMEs</strong> (Indonesian <em>warungs</em>, Philippine <em>sari-sari</em> &amp; loom weavers, Indian <em>karigars</em>) struggle to sell globally due to language barriers and lack of SEO skills. <strong>OmniLang</strong> turns WhatsApp &amp; LINE into a multimodal AI export desk powered by <strong>Gemini 2.5 Flash</strong>, <strong>Vertex AI Translation</strong>, <strong>Dialogflow CX</strong>, and <strong>Cloud Run</strong>.
        </div>
      </div>

      <!-- Dialogflow CX Negotiation State Machine -->
      <div id="dfcxCard" class="card">
        <div class="card-header">
          <span class="card-title">🔁 Dialogflow CX Conversational State Machine</span>
          <span id="activeNegotiationBadge" style="font-size:11px;color:#94a3b8;">Awaiting buyer inquiry</span>
        </div>
        <div class="state-track">
          <div id="st-INQUIRY" class="state-node">1. INQUIRY</div>
          <div id="st-OFFER" class="state-node">2. OFFER ⇄</div>
          <div id="st-SHIPPING" class="state-node">3. SHIPPING</div>
          <div id="st-INVOICED" class="state-node">4. INVOICED</div>
          <div id="st-PAID" class="state-node">5. PAID</div>
        </div>
      </div>

      <!-- Live Gemini 2.5 Flash Generated Catalog Card -->
      <div id="catalogCardBox" class="card">
        <div class="card-header">
          <span class="card-title">✨ Gemini 2.5 Flash — Multimodal SEO Catalog &amp; FX Engine</span>
          <a id="catalogLink" href="#" target="_blank" style="font-size:11px;color:#38bdf8;text-decoration:none;display:none;">Public Listing ↗</a>
        </div>
        <div id="catalogEmpty" style="font-size:12px;color:#94a3b8;padding:10px 0;text-align:center;">
          ⏳ Waiting for merchant product photo upload on WhatsApp...
        </div>
        <div id="catalogContent" class="catalog-card" style="display:none;">
          <div id="catalogThumb" class="craft-thumb"></div>
          <div>
            <div id="catalogTitle" style="font-size:14.5px;font-weight:800;color:#fff;"></div>
            <div id="catalogFx" class="fx-row"></div>
            <div id="catalogDesc" style="font-size:11.5px;color:#cbd5e1;line-height:1.42;"></div>
            <div id="catalogMeta" style="font-size:10.5px;color:#94a3b8;margin-top:5px;"></div>
            <div id="catalogTags" class="tag-row"></div>
          </div>
        </div>
      </div>

      <!-- Automated Deal Closing & Cross-Border Invoicing -->
      <div id="dealCardBox" class="card">
        <div class="card-header">
          <span class="card-title">💳 Automated Order Closing &amp; Cross-Border Invoicing</span>
          <span id="orderStatusBadge" style="font-size:11px;color:#34d399;font-weight:700;"></span>
        </div>
        <div class="deal-bar">
          <div>
            <label class="field-label">Quantity</label>
            <input id="dealQty" type="number" class="field-input" value="5" />
          </div>
          <div>
            <label class="field-label">Agreed Unit Price</label>
            <input id="dealUnit" type="number" class="field-input" value="135000" />
          </div>
          <div>
            <label class="field-label">Intl Shipping</label>
            <input id="dealShip" type="number" class="field-input" value="120000" />
          </div>
          <div style="display:flex;gap:6px;">
            <button id="btnCloseDeal" class="btn btn-amber" onclick="closeActiveDeal()">⚡ Close Deal &amp; Invoice</button>
            <button id="btnPayOrder" class="btn" style="display:none;" onclick="simulatePayment()">💸 Mark PAID</button>
          </div>
        </div>
      </div>

      <!-- Live Cloud Run API Telemetry Log -->
      <div class="card" style="padding:9px 14px;">
        <div class="card-header" style="margin-bottom:4px;">
          <span class="card-title">☁️ Live Cloud Run REST &amp; Webhook Telemetry</span>
          <span id="backendModeLabel" style="font-size:10px;color:#34d399;font-weight:700;">Connected to Express Backend</span>
        </div>
        <div id="apiLog" class="api-log">
          <div class="log-entry"><span class="log-method">BOOT</span><span>OmniLang Clean Architecture container active on Cloud Run</span></div>
        </div>
      </div>
    </section>

    <!-- Right Column: International Buyer WhatsApp Simulator -->
    <section id="buyerPhone" class="phone">
      <div class="phone-header">
        <div class="phone-header-top">
          <span class="phone-role role-buyer">🌏 International Buyer WhatsApp</span>
          <span id="buyerLangBadge" style="font-size:11px;color:#38bdf8;font-weight:700;">JA · Tokyo</span>
        </div>
        <select id="buyerSelect" class="phone-select" onchange="onBuyerChange()">
          <option value="819012345678">🇯🇵 Kenji Sato (Tokyo Boutique · Japanese · JA)</option>
          <option value="6591234567">🇸🇬 Maya Lin (Singapore Concept Store · English · EN)</option>
        </select>
      </div>

      <div id="buyerFeed" class="chat-feed"></div>

      <div class="phone-composer">
        <div class="preset-row">
          <button id="btnBuyerAsk" class="preset-chip" onclick="sendBuyerInquiry()">👋 1. Ask Price &amp; Shipping (JA)</button>
          <button id="btnBuyerAccept" class="preset-chip" onclick="sendBuyerAccept()">🤝 2. Accept Offer &amp; Request Link (JA)</button>
        </div>
        <div class="composer-input-row">
          <input id="buyerInput" class="composer-input" placeholder="Buyer inquiry in Japanese, English..." />
          <button id="btnBuyerSend" class="btn btn-primary" onclick="sendBuyerCustom()">Send</button>
        </div>
      </div>
    </section>
  </main>

  <!-- Bottom Teleprompter / Narration Bar -->
  <footer class="teleprompter">
    <span id="scriptSceneBadge" class="script-tag">SCENE 1 · 0:00–0:15</span>
    <div id="scriptCaption" class="script-text">
      "Across JAPAC, millions of warungs, sari-sari stores, and local artisans create extraordinary products—yet language barriers and zero digital marketing skills lock them out of global e-commerce. Meet OmniLang SME Commerce Agent, built on Google Cloud."
    </div>
  </footer>

  <script>
    const SCENARIOS = {
      'm-001': {
        merchantId: 'm-001',
        name: 'Warung Sari Batik (Pekalongan)',
        address: '6281234567890',
        langCode: 'id',
        lang: 'ID · IDR',
        currency: 'IDR',
        photoLabel: '🎨 Pekalongan Canting Batik Tulis',
        photoGradient: 'linear-gradient(135deg, #1e3a8a 0%, #92400e 55%, #fbbf24 100%)',
        note: 'Ini batik tulis Pekalongan asli, mau jual 150.000 per lembar',
        merchantReply: 'Siap kak! 5 lembar stok ada. Kalau ambil 5 saya kasih diskon jadi 135rb/lembar. Ongkir EMS ke Tokyo Rp 120.000 ya',
        buyerInquiry: '5個購入希望です。東京までの送料は？',
        buyerAccept: 'ありがとうございます！その条件で5枚お願いします。決済リンクをお願いします。',
        deal: { qty: 5, unit: 135000, ship: 120000 },
        fallbackListing: {
          id: 'batik-001',
          merchantId: 'm-001',
          title: 'Hand-Dyed Batik Textile Art (Pekalongan Style)',
          description: 'A one-of-a-kind batik textile hand-drawn with traditional canting wax-resist techniques. Vibrant botanical motifs in deep indigo and warm soga brown.',
          materials: ['cotton', 'beeswax', 'natural dyes'],
          colors: ['indigo', 'soga brown', 'cream'],
          estimatedDimensions: 'Approx. 100 cm × 100 cm',
          careInstructions: 'Hand wash cold, dry in shade',
          tags: ['batik', 'handmade', 'textile', 'indonesian', 'art', 'handdyed', 'boho'],
          basePrice: { amount: 150000, currency: 'IDR' },
          priceConversions: [
            { amount: 10, currency: 'USD' },
            { amount: 1470, currency: 'JPY' },
            { amount: 13, currency: 'SGD' }
          ]
        }
      },
      'm-002': {
        merchantId: 'm-002',
        name: 'Tindahan ni Aling Rosa (Ilocos)',
        address: '639171234567',
        langCode: 'tl',
        lang: 'TL · PHP',
        currency: 'PHP',
        photoLabel: '🧶 Ilocos Binakul Inabel Blanket',
        photoGradient: 'linear-gradient(135deg, #0284c7 0%, #0f172a 55%, #ea580c 100%)',
        note: 'Inabel blanket mula Ilocos, benta ko 1,200 bawat isa',
        merchantReply: 'Pwede po! Kung 3 piraso bigay ko ng 1,100 bawat isa plus 250 shipping.',
        buyerInquiry: '5個購入希望です。東京までの送料は？',
        buyerAccept: 'ありがとうございます！その条件で5枚お願いします。決済リンクをお願いします。',
        deal: { qty: 3, unit: 1100, ship: 250 },
        fallbackListing: {
          id: 'inabel-002',
          merchantId: 'm-002',
          title: 'Handwoven Ilocos Inabel Cotton Blanket (Binakul Geometric Weave)',
          description: 'Heirloom-quality Inabel cotton throw handwoven on traditional wooden pedal looms in Ilocos, Philippines.',
          materials: ['100% hand-spun cotton', 'natural indigo dye'],
          colors: ['ocean blue', 'ivory white', 'terracotta'],
          estimatedDimensions: 'Approx. 150 cm × 200 cm',
          careInstructions: 'Gentle cold wash with mild soap',
          tags: ['inabel', 'philippines', 'handwoven', 'binakul', 'artisan', 'textile'],
          basePrice: { amount: 1200, currency: 'PHP' },
          priceConversions: [
            { amount: 23, currency: 'USD' },
            { amount: 3564, currency: 'JPY' },
            { amount: 31, currency: 'SGD' }
          ]
        }
      },
      'm-003': {
        merchantId: 'm-003',
        name: 'Jaipur Kala Studio (Rajasthan)',
        address: '919876543210',
        langCode: 'hi',
        lang: 'HI · INR',
        currency: 'INR',
        photoLabel: '🌿 Jaipur Sanganeri Indigo Block Print',
        photoGradient: 'linear-gradient(135deg, #312e81 0%, #1e40af 50%, #991b1b 100%)',
        note: 'यह जयपुर की ब्लॉक प्रिंट चादर है, कीमत 1,500 प्रति पीस',
        merchantReply: 'जी बिल्कुल! 4 पीस पर विशेष छूट के साथ 1,350 प्रति पीस और 600 शिपिंग लगेगा।',
        buyerInquiry: '5個購入希望です。東京までの送料は？',
        buyerAccept: 'ありがとうございます！その条件で5枚お願いします。決済リンクをお願いします。',
        deal: { qty: 4, unit: 1350, ship: 600 },
        fallbackListing: {
          id: 'jaipur-003',
          merchantId: 'm-003',
          title: 'Hand-Block Printed Jaipur Indigo Cotton Throw (Natural Vegetable Dye)',
          description: 'Artisanal Sanganeri hand-block printed cotton throw from Jaipur, Rajasthan. Stamped by master karigars using carved teakwood blocks.',
          materials: ['organic mulmul cotton', 'natural indigo', 'madder root dye'],
          colors: ['deep indigo', 'madder red', 'unbleached cotton'],
          estimatedDimensions: 'Approx. 140 cm × 220 cm',
          careInstructions: 'Wash separately in cold water',
          tags: ['jaipur', 'blockprint', 'indigo', 'indianartisan', 'handmade', 'sustainable'],
          basePrice: { amount: 1500, currency: 'INR' },
          priceConversions: [
            { amount: 18, currency: 'USD' },
            { amount: 2722, currency: 'JPY' },
            { amount: 23, currency: 'SGD' }
          ]
        }
      }
    };

    const SCRIPTS = {
      1: {
        badge: 'SCENE 1 · 0:00–0:15',
        caption: 'Across JAPAC, micro-SMEs like Indonesian warungs, Philippine sari-sari & loom artisans, and Indian karigars struggle to sell globally due to language barriers and lack of SEO skills. OmniLang turns any WhatsApp or LINE chat into an AI global storefront powered by Gemini 2.5 Flash, Vertex AI Translation, Dialogflow CX, and Cloud Run.'
      },
      2: {
        badge: 'SCENE 2 · 0:15–0:46',
        caption: 'Watch Ibu Sari in Pekalongan snap a simple photo of her hand-drawn batik on WhatsApp with a colloquial Bahasa note: "mau jual 150.000 per lembar". Gemini 2.5 Flash analyzes the craft, generates an SEO-optimized global listing, and snapshots IDR to USD, JPY, and SGD prices in seconds.'
      },
      3: {
        badge: 'SCENE 3 · 0:46–1:36',
        caption: 'Now Kenji in Tokyo inquiries in Japanese about buying 5 pieces and EMS shipping. Dialogflow CX opens an INQUIRY session while Vertex AI translates his message into natural Bahasa Indonesia. Ibu Sari replies with a bulk discount in Bahasa—and Kenji receives polite business Japanese as the state advances to OFFER and SHIPPING.'
      },
      4: {
        badge: 'SCENE 4 · 1:36–2:05',
        caption: 'Once both sides agree, OmniLang freezes the negotiated terms—5 pieces at Rp 135,000 plus Rp 120,000 EMS shipping—advances Dialogflow CX to INVOICED, and dispatches a cross-border payment link translated into both Japanese and Bahasa Indonesia, before settling to PAID.'
      },
      5: {
        badge: 'SCENE 5 · 2:05–2:45',
        caption: 'OmniLang scales effortlessly across local dialects—watch Aling Rosa in the Philippines catalog Ilocos Inabel in Tagalog and Jaipur Kala Studio catalog block-printed cotton in Hindi. Because onboarding is a single config entry on serverless Cloud Run, this same architecture empowers micro-merchants across LATAM, Africa, and beyond.'
      }
    };

    let currentMerchantId = 'm-001';
    let currentBuyerAddress = '819012345678';
    let activeNegotiationId = null;
    let activeListingId = null;
    let localSentPhotos = [];
    let localInboundTurns = [];
    let autoPlayActive = false;
    let autoPlayTimeouts = [];
    let timerInterval = null;
    let elapsedSeconds = 0;
    let voiceoverEnabled = true;
    let offlineFallbackMode = false;
    let latestState = { listings: [], negotiations: [], orders: [], outbox: [] };

    function setDirectorStatus(text) {
      document.getElementById('directorAction').textContent = '🎬 ' + text;
    }

    function pulseElement(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('pulse-action');
      void el.offsetWidth;
      el.classList.add('pulse-action');
    }

    function spotlightCard(cardId) {
      ['storyCard', 'dfcxCard', 'catalogCardBox', 'dealCardBox'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('spotlight', id === cardId);
      });
    }

    async function typeIntoInput(inputId, text, durationMs = 2600) {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.classList.add('typing');
      input.value = '';
      const steps = Math.min(text.length, 28);
      const stepTime = Math.max(25, Math.floor(durationMs / steps));
      for (let i = 1; i <= steps; i++) {
        if (!autoPlayActive) break;
        const chars = Math.ceil((i / steps) * text.length);
        input.value = text.slice(0, chars);
        await new Promise((r) => setTimeout(r, stepTime));
      }
      input.value = text;
      await new Promise((r) => setTimeout(r, 250));
      input.classList.remove('typing');
      input.value = '';
    }

    function logApi(method, path, status, summary) {
      const box = document.getElementById('apiLog');
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.innerHTML = '<span class="log-method">' + method + '</span>' +
        '<span>' + path + '</span>' +
        '<span class="log-status">' + status + '</span>' +
        '<span>— ' + summary + '</span>';
      box.prepend(div);
    }

    function highlightStack(id) {
      ['pill-gemini', 'pill-vertex', 'pill-dfcx', 'pill-cloudrun'].forEach((pid) => {
        const el = document.getElementById(pid);
        if (el) el.classList.toggle('active', pid === id || pid === 'pill-cloudrun');
      });
    }

    function speakText(text) {
      if (!voiceoverEnabled || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      } catch (_e) {}
    }

    function toggleVoiceover() {
      voiceoverEnabled = !voiceoverEnabled;
      const btn = document.getElementById('btnTts');
      btn.textContent = voiceoverEnabled ? '🔊 Voiceover: ON' : '🔇 Voiceover: OFF';
      if (!voiceoverEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }

    function setSceneUI(sceneNum) {
      for (let i = 1; i <= 5; i++) {
        document.getElementById('tab-' + i).classList.toggle('active', i === sceneNum);
      }
      const s = SCRIPTS[sceneNum];
      if (s) {
        document.getElementById('scriptSceneBadge').textContent = s.badge;
        document.getElementById('scriptCaption').textContent = '"' + s.caption + '"';
        speakText(s.caption);
      }
      document.getElementById('merchantPhone').classList.toggle('highlight', sceneNum === 2 || sceneNum === 3 || sceneNum === 5);
      document.getElementById('buyerPhone').classList.toggle('highlight', sceneNum === 3 || sceneNum === 4);
    }

    async function jumpToScene(sceneNum) {
      setSceneUI(sceneNum);
      if (sceneNum === 1) {
        highlightStack('pill-cloudrun');
        spotlightCard('storyCard');
      } else if (sceneNum === 2) {
        highlightStack('pill-gemini');
        spotlightCard('catalogCardBox');
        if (!activeListingId) await sendMerchantCatalogPhoto();
      } else if (sceneNum === 3) {
        highlightStack('pill-vertex');
        spotlightCard('dfcxCard');
        if (!activeListingId) await sendMerchantCatalogPhoto();
        if (!activeNegotiationId) await sendBuyerInquiry();
      } else if (sceneNum === 4) {
        highlightStack('pill-dfcx');
        spotlightCard('dealCardBox');
        if (!activeNegotiationId) {
          await sendMerchantCatalogPhoto();
          await sendBuyerInquiry();
        }
        await closeActiveDeal();
      } else if (sceneNum === 5) {
        highlightStack('pill-gemini');
        spotlightCard('catalogCardBox');
        document.getElementById('merchantSelect').value = 'm-002';
        await onMerchantChange();
        await sendMerchantCatalogPhoto();
      }
    }

    async function onMerchantChange() {
      currentMerchantId = document.getElementById('merchantSelect').value;
      const sc = SCENARIOS[currentMerchantId];
      document.getElementById('merchantLangBadge').textContent = sc.lang;
      document.getElementById('dealQty').value = sc.deal.qty;
      document.getElementById('dealUnit').value = sc.deal.unit;
      document.getElementById('dealShip').value = sc.deal.ship;
      await refreshState();
    }

    async function onBuyerChange() {
      currentBuyerAddress = document.getElementById('buyerSelect').value;
      document.getElementById('buyerLangBadge').textContent =
        currentBuyerAddress.startsWith('81') ? 'JA · Tokyo' : 'EN · Singapore';
      await refreshState();
    }

    function makeSvgBase64(label) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
        '<rect width="100%" height="100%" fill="#1e3a8a"/>' +
        '<text x="50%" y="50%" fill="#fff" font-size="20" text-anchor="middle">' + label + '</text></svg>';
      return btoa(unescape(encodeURIComponent(svg)));
    }

    async function sendMerchantCatalogPhoto() {
      const sc = SCENARIOS[currentMerchantId];
      highlightStack('pill-gemini');
      spotlightCard('catalogCardBox');
      pulseElement('btnSnapPhoto');
      localSentPhotos.push({
        merchantAddress: sc.address,
        label: sc.photoLabel,
        gradient: sc.photoGradient,
        note: sc.note,
        sentAt: new Date().toISOString()
      });
      renderFeeds();

      try {
        const res = await fetch('/api/merchants/' + encodeURIComponent(currentMerchantId) + '/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: makeSvgBase64(sc.photoLabel),
            mimeType: 'image/jpeg',
            note: sc.note
          })
        });
        const data = await res.json();
        logApi('POST', '/api/merchants/' + currentMerchantId + '/listings', res.status, 'Gemini 2.5 Flash published "' + (data.title || '') + '"');
      } catch (_err) {
        offlineFallbackMode = true;
        const fl = sc.fallbackListing;
        latestState.listings = [fl, ...latestState.listings.filter((x) => x.id !== fl.id)];
        const fxStr = fl.priceConversions.map((c) => c.currency + ' ' + c.amount).join(' / ');
        latestState.outbox.push({
          id: 'out-' + Date.now(),
          channel: 'whatsapp',
          to: sc.address,
          text: '✅ Approved! Live listing published to the global catalog.\\n\\n📦 ' + fl.title + '\\n💰 ' + fl.basePrice.currency + ' ' + fl.basePrice.amount.toLocaleString() + ' (' + fxStr + ')\\n' + fl.description,
          sentAt: new Date().toISOString()
        });
        logApi('POST', '/api/merchants/' + currentMerchantId + '/listings', 201, 'Gemini 2.5 Flash published "' + fl.title + '"');
      }
      await refreshState();
    }

    async function sendWebhookMessage(fromAddress, text, merchantAddress, offlineTranslation, offlineTarget, nextStage) {
      localInboundTurns.push({
        from: fromAddress,
        to: merchantAddress,
        text,
        sentAt: new Date().toISOString()
      });
      renderFeeds();

      try {
        const payload = {
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                metadata: { display_phone_number: merchantAddress },
                messages: [{ from: fromAddress, type: 'text', text: { body: text } }]
              }
            }]
          }]
        };

        const res = await fetch('/webhooks/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        logApi('POST', '/webhooks/whatsapp', res.status, 'Vertex AI relayed turn + Dialogflow CX state updated');
      } catch (_err) {
        offlineFallbackMode = true;
        const sc = SCENARIOS[currentMerchantId];
        let neg = latestState.negotiations.find((n) => n.merchantId === currentMerchantId);
        if (!neg) {
          neg = {
            id: 'neg-' + currentMerchantId,
            merchantId: currentMerchantId,
            merchantLanguage: sc.langCode,
            buyerLanguage: 'ja',
            stage: 'INQUIRY',
            turns: []
          };
          latestState.negotiations.unshift(neg);
        }
        if (nextStage) neg.stage = nextStage;
        neg.turns.push({ text, translated: offlineTranslation });
        latestState.outbox.push({
          id: 'out-' + Date.now(),
          channel: 'whatsapp',
          to: offlineTarget,
          text: offlineTranslation,
          sentAt: new Date().toISOString()
        });
        logApi('POST', '/webhooks/whatsapp', 200, 'Vertex AI relayed turn -> Stage: ' + neg.stage);
      }
      await refreshState();
    }

    async function sendBuyerInquiry() {
      const sc = SCENARIOS[currentMerchantId];
      highlightStack('pill-vertex');
      spotlightCard('dfcxCard');
      pulseElement('btnBuyerAsk');
      const translatedByLang = {
        'm-001': 'Halo Kak! Saya tertarik beli 5 lembar. Ongkir ke Tokyo berapa ya?',
        'm-002': 'Kumusta po! Gusto ko pong bumili ng 5 piraso. Magkano po ang shipping papuntang Tokyo?',
        'm-003': 'नमस्ते! मैं 5 पीस खरीदना चाहता हूँ। टोक्यो तक शिपिंग का खर्च कितना होगा?'
      };
      await sendWebhookMessage(currentBuyerAddress, sc.buyerInquiry, sc.address, translatedByLang[currentMerchantId], sc.address, 'INQUIRY');
    }

    async function sendMerchantPresetReply() {
      const sc = SCENARIOS[currentMerchantId];
      highlightStack('pill-vertex');
      spotlightCard('dfcxCard');
      pulseElement('btnMerchantReply');
      const jaByLang = {
        'm-001': 'はい、在庫ございます！5枚まとめてご購入いただける場合、1枚135,000ルピア（約1,320円）に割引いたします。東京までのEMS送料は120,000ルピア（約1,180円）です。',
        'm-002': 'はい、大丈夫です！3枚セットなら1枚1,100ペソに割引し、送料250ペソでお送りできます。',
        'm-003': 'かしこまりました！4枚でしたら特別価格で1枚1,350ルピー、国際送料600ルピーでお届けいたします。'
      };
      await sendWebhookMessage(sc.address, sc.merchantReply, sc.address, jaByLang[currentMerchantId], currentBuyerAddress, 'OFFER');
    }

    async function sendBuyerAccept() {
      const sc = SCENARIOS[currentMerchantId];
      highlightStack('pill-dfcx');
      spotlightCard('dfcxCard');
      pulseElement('btnBuyerAccept');
      const acceptByLang = {
        'm-001': 'Terima kasih banyak! Saya setuju ambil 5 lembar dengan harga diskon & ongkir EMS tersebut. Tolong kirimkan link pembayarannya ya, Kak.',
        'm-002': 'Maraming salamat po! Kunin ko na po ang 5 piraso sa presyong iyan. Pakipadala na lang po ang payment link.',
        'm-003': 'बहुत धन्यवाद! मुझे यह डील मंजूर है, कृपया 5 पीस के लिए पेमेंट लिंक भेजें।'
      };
      await sendWebhookMessage(currentBuyerAddress, sc.buyerAccept, sc.address, acceptByLang[currentMerchantId], sc.address, 'SHIPPING');
    }

    async function sendMerchantCustom() {
      const input = document.getElementById('merchantInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      const sc = SCENARIOS[currentMerchantId];
      await sendWebhookMessage(sc.address, text, sc.address, '[JA] ' + text, currentBuyerAddress, 'OFFER');
    }

    async function sendBuyerCustom() {
      const input = document.getElementById('buyerInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      const sc = SCENARIOS[currentMerchantId];
      await sendWebhookMessage(currentBuyerAddress, text, sc.address, '[' + sc.langCode.toUpperCase() + '] ' + text, sc.address, 'INQUIRY');
    }

    async function closeActiveDeal() {
      const sc = SCENARIOS[currentMerchantId];
      if (!activeNegotiationId) {
        await sendBuyerInquiry();
      }
      if (!activeNegotiationId) return;

      highlightStack('pill-dfcx');
      spotlightCard('dealCardBox');
      pulseElement('btnCloseDeal');
      const qty = Number(document.getElementById('dealQty').value) || sc.deal.qty;
      const unit = Number(document.getElementById('dealUnit').value) || sc.deal.unit;
      const ship = Number(document.getElementById('dealShip').value) || sc.deal.ship;

      try {
        const res = await fetch('/api/negotiations/' + encodeURIComponent(activeNegotiationId) + '/close-deal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: qty,
            unitPriceAmount: unit,
            unitPriceCurrency: sc.currency,
            shippingCostAmount: ship
          })
        });
        const order = await res.json();
        if (res.ok) {
          logApi('POST', '/api/negotiations/' + activeNegotiationId.slice(0, 8) + '/close-deal', res.status,
            'Issued invoice ' + order.invoiceId.slice(0, 14) + ' (' + order.total.currency + ' ' + order.total.amount.toLocaleString() + ')');
          document.getElementById('orderStatusBadge').textContent =
            '✅ Invoice ' + order.invoiceId.slice(0, 12) + ' · ' + order.total.currency + ' ' + order.total.amount.toLocaleString();
          document.getElementById('btnPayOrder').style.display = 'inline-flex';
        }
      } catch (_err) {
        const totalAmt = qty * unit + ship;
        const neg = latestState.negotiations.find((n) => n.id === activeNegotiationId);
        if (neg) neg.stage = 'INVOICED';
        latestState.outbox.push({
          id: 'out-b-' + Date.now(),
          channel: 'whatsapp',
          to: currentBuyerAddress,
          text: '🎉 ご注文が確定しました！ (' + qty + ' × ' + sc.fallbackListing.title + ')\\n・合計金額: Rp' + totalAmt.toLocaleString() + ' IDR\\n💳 安全なクロスボーダー決済リンク: https://omnilang.shop/pay/demo-inv-795k',
          sentAt: new Date().toISOString()
        });
        latestState.outbox.push({
          id: 'out-m-' + Date.now(),
          channel: 'whatsapp',
          to: sc.address,
          text: '🎉 Pesanan baru berhasil ditutup!\\n📦 ' + qty + ' × ' + sc.fallbackListing.title + '\\n💰 Total tagihan pembeli: Rp' + totalAmt.toLocaleString() + ' IDR\\n🔗 Link pembayaran sudah dikirim ke pembeli.',
          sentAt: new Date().toISOString()
        });
        document.getElementById('orderStatusBadge').textContent =
          '✅ Invoice demo-inv-795k · ' + sc.currency + ' ' + totalAmt.toLocaleString();
        document.getElementById('btnPayOrder').style.display = 'inline-flex';
        logApi('POST', '/api/negotiations/close-deal', 201, 'Issued cross-border invoice (' + sc.currency + ' ' + totalAmt.toLocaleString() + ')');
      }
      await refreshState();
    }

    async function simulatePayment() {
      if (!activeNegotiationId) return;
      pulseElement('btnPayOrder');
      try {
        const res = await fetch('/api/demo/negotiations/' + encodeURIComponent(activeNegotiationId) + '/pay', {
          method: 'POST'
        });
        if (res.ok) {
          logApi('POST', '/api/demo/negotiations/' + activeNegotiationId.slice(0, 8) + '/pay', 200, 'Escrow payment settled -> State: PAID');
          document.getElementById('btnPayOrder').style.display = 'none';
        }
      } catch (_err) {
        const sc = SCENARIOS[currentMerchantId];
        const neg = latestState.negotiations.find((n) => n.id === activeNegotiationId);
        if (neg) neg.stage = 'PAID';
        latestState.outbox.push({
          id: 'out-p1-' + Date.now(),
          channel: 'whatsapp',
          to: sc.address,
          text: '💸 Payment received! Order is now PAID and ready to ship.',
          sentAt: new Date().toISOString()
        });
        latestState.outbox.push({
          id: 'out-p2-' + Date.now(),
          channel: 'whatsapp',
          to: currentBuyerAddress,
          text: '✅ Payment confirmed! The artisan has been notified to dispatch your international shipment.',
          sentAt: new Date().toISOString()
        });
        document.getElementById('btnPayOrder').style.display = 'none';
        logApi('POST', '/api/demo/negotiations/pay', 200, 'Escrow payment settled -> State: PAID');
      }
      await refreshState();
    }

    async function refreshState() {
      if (!offlineFallbackMode) {
        try {
          const res = await fetch('/api/demo/state');
          latestState = await res.json();
        } catch (_err) {
          offlineFallbackMode = true;
          document.getElementById('backendModeLabel').textContent = 'In-Browser Clean Architecture Engine';
        }
      }
      renderHub();
      renderFeeds();
    }

    function renderHub() {
      const sc = SCENARIOS[currentMerchantId];
      const merchantListings = latestState.listings.filter((l) => l.merchantId === currentMerchantId);
      const listing = merchantListings[0] || latestState.listings[0] || null;

      if (listing) {
        activeListingId = listing.id;
        document.getElementById('catalogEmpty').style.display = 'none';
        document.getElementById('catalogContent').style.display = 'grid';
        const link = document.getElementById('catalogLink');
        link.style.display = 'inline';
        link.href = '/p/' + encodeURIComponent(listing.id);

        const thumb = document.getElementById('catalogThumb');
        const listingSc = SCENARIOS[listing.merchantId] || sc;
        thumb.style.background = listingSc.photoGradient;
        thumb.textContent = listingSc.photoLabel;

        document.getElementById('catalogTitle').textContent = listing.title;
        document.getElementById('catalogDesc').textContent = listing.description;
        document.getElementById('catalogMeta').textContent =
          'Materials: ' + (listing.materials || []).join(', ') +
          ' · Dimensions: ' + (listing.estimatedDimensions || 'Standard') +
          ' · Care: ' + (listing.careInstructions || 'Hand wash');

        const fxHtml = ['<span class="fx-badge primary">' + listing.basePrice.currency + ' ' + Number(listing.basePrice.amount).toLocaleString() + '</span>']
          .concat((listing.priceConversions || []).map((c) => '<span class="fx-badge">≈ ' + c.currency + ' ' + Number(c.amount).toLocaleString() + '</span>'))
          .join('');
        document.getElementById('catalogFx').innerHTML = fxHtml;

        document.getElementById('catalogTags').innerHTML = (listing.tags || [])
          .map((t) => '<span class="tag-pill">#' + t + '</span>')
          .join('');
      } else {
        activeListingId = null;
        document.getElementById('catalogEmpty').style.display = 'block';
        document.getElementById('catalogContent').style.display = 'none';
        document.getElementById('catalogLink').style.display = 'none';
      }

      const merchantNegotiations = latestState.negotiations.filter((n) => n.merchantId === currentMerchantId);
      const neg = merchantNegotiations[0] || latestState.negotiations[0] || null;
      const stages = ['INQUIRY', 'OFFER', 'SHIPPING', 'INVOICED', 'PAID'];

      if (neg) {
        activeNegotiationId = neg.id;
        document.getElementById('activeNegotiationBadge').textContent =
          'Session ' + neg.id.slice(0, 8) + ' · ' + neg.buyerLanguage.toUpperCase() + ' ⇄ ' + neg.merchantLanguage.toUpperCase() + ' (' + neg.turns.length + ' turns)';
        const currentIdx = stages.indexOf(neg.stage);
        stages.forEach((st, idx) => {
          const el = document.getElementById('st-' + st);
          el.className = 'state-node' + (idx < currentIdx ? ' done' : idx === currentIdx ? ' current' : '');
        });
      } else {
        activeNegotiationId = null;
        document.getElementById('activeNegotiationBadge').textContent = 'Awaiting buyer inquiry';
        stages.forEach((st) => {
          document.getElementById('st-' + st).className = 'state-node';
        });
      }
    }

    function renderFeeds() {
      const sc = SCENARIOS[currentMerchantId];
      const merchantFeed = document.getElementById('merchantFeed');
      const buyerFeed = document.getElementById('buyerFeed');

      const merchantEvents = [];
      for (const p of localSentPhotos.filter((x) => x.merchantAddress === sc.address)) {
        merchantEvents.push({
          kind: 'sent-photo',
          label: p.label,
          gradient: p.gradient,
          text: p.note,
          sentAt: p.sentAt
        });
      }
      for (const m of localInboundTurns.filter((x) => x.from === sc.address)) {
        merchantEvents.push({
          kind: 'sent',
          meta: 'You (' + sc.lang.split(' ')[0] + ')',
          text: m.text,
          sentAt: m.sentAt
        });
      }
      for (const out of (latestState.outbox || []).filter((x) => x.to === sc.address)) {
        merchantEvents.push({
          kind: 'received',
          meta: '🤖 OmniLang Agent → Merchant',
          text: out.text,
          sentAt: out.sentAt
        });
      }
      merchantEvents.sort((a, b) => a.sentAt.localeCompare(b.sentAt));

      if (merchantEvents.length === 0) {
        merchantFeed.innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;margin-top:40px;">📱 WhatsApp Business ready — Auto-Director will snap a product photo &amp; dialect price note...</div>';
      } else {
        merchantFeed.innerHTML = merchantEvents.map((ev) => {
          if (ev.kind === 'sent-photo') {
            return '<div class="bubble sent">' +
              '<div class="bubble-meta"><span>You · Product Photo</span><span>WhatsApp</span></div>' +
              '<div class="bubble-photo" style="background:' + ev.gradient + ';">' + ev.label + '</div>' +
              '<div>' + ev.text + '</div>' +
            '</div>';
          }
          return '<div class="bubble ' + ev.kind + '">' +
            '<div class="bubble-meta"><span>' + ev.meta + '</span></div>' +
            '<div>' + ev.text + '</div>' +
          '</div>';
        }).join('');
        merchantFeed.scrollTop = merchantFeed.scrollHeight;
      }

      const buyerEvents = [];
      for (const b of localInboundTurns.filter((x) => x.from === currentBuyerAddress && x.to === sc.address)) {
        buyerEvents.push({
          kind: 'sent',
          meta: 'Kenji Sato (Tokyo · JA)',
          text: b.text,
          sentAt: b.sentAt
        });
      }
      for (const out of (latestState.outbox || []).filter((x) => x.to === currentBuyerAddress)) {
        buyerEvents.push({
          kind: 'received',
          meta: '🤖 OmniLang Bridge → Buyer (JA)',
          text: out.text,
          sentAt: out.sentAt
        });
      }
      buyerEvents.sort((a, b) => a.sentAt.localeCompare(b.sentAt));

      if (buyerEvents.length === 0) {
        buyerFeed.innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;margin-top:40px;">🌏 Buyer WhatsApp ready — Auto-Director will send Japanese inquiry from Tokyo...</div>';
      } else {
        buyerFeed.innerHTML = buyerEvents.map((ev) =>
          '<div class="bubble ' + ev.kind + '">' +
            '<div class="bubble-meta"><span>' + ev.meta + '</span></div>' +
            '<div>' + ev.text + '</div>' +
          '</div>'
        ).join('');
        buyerFeed.scrollTop = buyerFeed.scrollHeight;
      }
    }

    async function resetDemo() {
      stopAutoPlay();
      localSentPhotos = [];
      localInboundTurns = [];
      activeNegotiationId = null;
      activeListingId = null;
      latestState = { listings: [], negotiations: [], orders: [], outbox: [] };
      document.getElementById('orderStatusBadge').textContent = '';
      document.getElementById('btnPayOrder').style.display = 'none';
      document.getElementById('merchantSelect').value = 'm-001';
      currentMerchantId = 'm-001';
      document.getElementById('merchantLangBadge').textContent = SCENARIOS['m-001'].lang;
      document.getElementById('dealQty').value = 5;
      document.getElementById('dealUnit').value = 135000;
      document.getElementById('dealShip').value = 120000;
      try {
        await fetch('/api/demo/reset', { method: 'POST' });
      } catch (_err) {
        offlineFallbackMode = true;
      }
      logApi('POST', '/api/demo/reset', 200, 'Reset repositories & re-seeded 3 JAPAC merchants');
      setSceneUI(1);
      await refreshState();
    }

    function formatMMSS(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      return m + ':' + s;
    }

    function stopAutoPlay() {
      autoPlayActive = false;
      autoPlayTimeouts.forEach((t) => clearTimeout(t));
      autoPlayTimeouts = [];
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      document.getElementById('btnAutoPlay').textContent = '▶ Resume Auto-Demo';
      document.getElementById('liveBadge').textContent = '⏸ PAUSED';
    }

    async function restartAutoPlay() {
      stopAutoPlay();
      await startHandsFreeAutoPlay();
    }

    async function toggleAutoPlay() {
      if (autoPlayActive) {
        stopAutoPlay();
      } else {
        await startHandsFreeAutoPlay();
      }
    }

    async function startHandsFreeAutoPlay() {
      await resetDemo();
      autoPlayActive = true;
      elapsedSeconds = 0;
      document.getElementById('btnAutoPlay').textContent = '⏹ Pause';
      document.getElementById('liveBadge').textContent = '● AUTO-PLAYING LIVE';
      document.getElementById('timerDisplay').textContent = '00:00 / 02:45';
      document.getElementById('progressFill').style.width = '0%';

      timerInterval = setInterval(() => {
        elapsedSeconds++;
        const pct = Math.min(100, (elapsedSeconds / 165) * 100);
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('timerDisplay').textContent = formatMMSS(elapsedSeconds) + ' / 02:45';
        if (elapsedSeconds >= 165) {
          setDirectorStatus('2:45 Demo Complete (Under 3:00 Limit)');
          stopAutoPlay();
          document.getElementById('liveBadge').textContent = '✅ 02:45 COMPLETE';
        }
      }, 1000);

      const schedule = (delayMs, fn) => {
        const id = setTimeout(async () => {
          if (!autoPlayActive) return;
          await fn();
        }, delayMs);
        autoPlayTimeouts.push(id);
      };

      // 0:00 — Scene 1: JAPAC Problem & Google Cloud Architecture Tour
      setSceneUI(1);
      spotlightCard('storyCard');
      setDirectorStatus('Scene 1: JAPAC Micro-SME Problem & Cloud Architecture');

      schedule(3500, async () => {
        highlightStack('pill-gemini');
        setDirectorStatus('Highlighting Gemini 2.5 Flash Multimodal Vision');
      });
      schedule(7000, async () => {
        highlightStack('pill-vertex');
        setDirectorStatus('Highlighting Vertex AI Dialect Translation Bridge');
      });
      schedule(10500, async () => {
        highlightStack('pill-dfcx');
        setDirectorStatus('Highlighting Dialogflow CX Negotiation State Machine');
      });

      // 0:15 — Scene 2: Warung Sari snaps Batik photo + colloquial Bahasa note
      schedule(15000, async () => {
        setSceneUI(2);
        spotlightCard('catalogCardBox');
        setDirectorStatus('Merchant typing Bahasa price note on WhatsApp...');
        await typeIntoInput('merchantInput', SCENARIOS['m-001'].note, 4500);
      });

      schedule(20500, async () => {
        setDirectorStatus('Uploading Batik photo -> Gemini 2.5 Flash Vision Cataloger');
        await sendMerchantCatalogPhoto();
      });

      schedule(30000, async () => {
        setDirectorStatus('Inspecting SEO Tags & Multi-Currency Snapshot (IDR -> USD/JPY/SGD)');
        pulseElement('catalogCardBox');
      });

      // 0:46 — Scene 3A: Tokyo Buyer inquiries in Japanese -> translated to Bahasa Indonesia (INQUIRY)
      schedule(46000, async () => {
        setSceneUI(3);
        spotlightCard('dfcxCard');
        setDirectorStatus('Tokyo Buyer typing inquiry in Japanese...');
        await typeIntoInput('buyerInput', SCENARIOS['m-001'].buyerInquiry, 4000);
      });

      schedule(51000, async () => {
        setDirectorStatus('Relaying JA -> ID via Vertex AI (Dialogflow CX: INQUIRY)');
        await sendBuyerInquiry();
      });

      // 1:05 — Scene 3B: Merchant replies in Bahasa Indonesia -> translated to Japanese (OFFER)
      schedule(65000, async () => {
        setDirectorStatus('Warung Sari typing bulk discount & EMS shipping in Bahasa...');
        await typeIntoInput('merchantInput', SCENARIOS['m-001'].merchantReply, 5000);
      });

      schedule(71000, async () => {
        setDirectorStatus('Relaying ID -> JA via Vertex AI (Dialogflow CX: OFFER)');
        await sendMerchantPresetReply();
      });

      // 1:24 — Scene 3C: Tokyo Buyer accepts in Japanese -> translated to Bahasa Indonesia (SHIPPING)
      schedule(84000, async () => {
        setDirectorStatus('Tokyo Buyer accepting terms in Japanese...');
        await typeIntoInput('buyerInput', SCENARIOS['m-001'].buyerAccept, 4000);
      });

      schedule(89000, async () => {
        setDirectorStatus('Relaying acceptance JA -> ID (Dialogflow CX: SHIPPING)');
        await sendBuyerAccept();
      });

      // 1:36 — Scene 4A: Close Deal & Issue Cross-Border Invoice (INVOICED)
      schedule(96000, async () => {
        setSceneUI(4);
        spotlightCard('dealCardBox');
        setDirectorStatus('Freezing deal terms: 5 × Rp135,000 + Rp120,000 EMS Shipping');
      });

      schedule(101000, async () => {
        setDirectorStatus('Executing CloseDealUseCase -> Issuing Cross-Border Invoice (INVOICED)');
        await closeActiveDeal();
      });

      // 1:54 — Scene 4B: Buyer settles cross-border invoice (PAID)
      schedule(114000, async () => {
        setDirectorStatus('Buyer settling Cross-Border Escrow Link -> State: PAID');
        await simulatePayment();
      });

      // 2:05 — Scene 5A: Switch to Philippines Artisan (Tagalog · PHP)
      schedule(125000, async () => {
        setSceneUI(5);
        spotlightCard('catalogCardBox');
        setDirectorStatus('Switching to Philippines Micro-SME (Tagalog · PHP)');
        document.getElementById('merchantSelect').value = 'm-002';
        await onMerchantChange();
        await typeIntoInput('merchantInput', SCENARIOS['m-002'].note, 3500);
      });

      schedule(130000, async () => {
        setDirectorStatus('Gemini 2.5 Flash cataloging Ilocos Inabel Blanket (PHP -> USD/JPY/SGD)');
        await sendMerchantCatalogPhoto();
      });

      schedule(136000, async () => {
        setDirectorStatus('Relaying Tagalog negotiation via Vertex AI Bridge');
        await sendBuyerInquiry();
        await sendMerchantPresetReply();
      });

      // 2:24 — Scene 5B: Switch to India Artisan (Hindi · INR) + Global Scale Finale
      schedule(144000, async () => {
        setDirectorStatus('Switching to India Artisan Studio (Hindi · INR)');
        document.getElementById('merchantSelect').value = 'm-003';
        await onMerchantChange();
        await typeIntoInput('merchantInput', SCENARIOS['m-003'].note, 3500);
      });

      schedule(149000, async () => {
        setDirectorStatus('Gemini 2.5 Flash cataloging Jaipur Indigo Block Print (INR -> USD/JPY/SGD)');
        await sendMerchantCatalogPhoto();
      });

      schedule(155000, async () => {
        setDirectorStatus('Relaying Hindi negotiation + Global Scale Summary (LATAM, Africa & Beyond)');
        await sendBuyerInquiry();
        await sendMerchantPresetReply();
        spotlightCard('storyCard');
        document.getElementById('storyTitle').innerHTML = '🌍 Global Scale: JAPAC → LATAM, Africa &amp; Worldwide Micro-Commerce';
        document.getElementById('storyBody').innerHTML =
          '<strong>Zero-Code Onboarding on Cloud Run:</strong> Indonesian <em>Warungs</em> (Bahasa), Philippine <em>Sari-Sari</em> &amp; Weavers (Tagalog), and Indian <em>Karigars</em> (Hindi) are live today—and any micro-SME in LATAM, Africa, or Southeast Asia can join in under 60 seconds.';
      });
    }

    // Unlock Web Speech API if browser requires a gesture, and auto-start immediately on load!
    window.addEventListener('pointerdown', () => {
      if (voiceoverEnabled && 'speechSynthesis' in window && !window.speechSynthesis.speaking) {
        const currentCaption = document.getElementById('scriptCaption')?.textContent || '';
        if (currentCaption) speakText(currentCaption);
      }
    }, { once: true });

    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        startHandsFreeAutoPlay();
      }, 600);
    });
  </script>
</body>
</html>`;
}
