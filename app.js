// ===== APP =====

// --- STATE ---
let state = {
  contacts: [],
  onomastici: [],
  settings: {
    senderName: '',
    senderRole: '',
    extraTitles: '',
    csvEncoding: 'ISO-8859-1',
    antiBanDelay: 3
  },
  vcfLoaded: false,
  csvLoaded: false
};

let cooldownTimer = null;
let cooldownEnd = 0;

// --- DOM REFS ---
const els = {
  todayDate: document.getElementById('today-date'),
  statsText: document.getElementById('stats-text'),
  filterPending: document.getElementById('filter-pending'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  contactsList: document.getElementById('contacts-list'),
  vcfFile: document.getElementById('vcf-file'),
  vcfStatus: document.getElementById('vcf-status'),
  vcfError: document.getElementById('vcf-error'),
  csvFile: document.getElementById('csv-file'),
  csvStatus: document.getElementById('csv-status'),
  csvError: document.getElementById('csv-error'),
  csvEncoding: document.getElementById('csv-encoding'),
  senderName: document.getElementById('sender-name'),
  senderRole: document.getElementById('sender-role'),
  extraTitles: document.getElementById('extra-titles'),
  antiBanDelay: document.getElementById('anti-ban-delay'),
  resetAll: document.getElementById('reset-all'),
  toast: document.getElementById('toast'),
  cooldownOverlay: document.getElementById('cooldown-overlay'),
  cooldownSec: document.getElementById('cooldown-sec')
};

// --- INIT ---
function init() {
  loadSettings();
  updateTodayDate();
  setupTabs();
  setupFileInputs();
  setupSettings();
  renderContacts();
}

function updateTodayDate() {
  const d = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  els.todayDate.textContent = d.toLocaleDateString('it-IT', opts);
}

// --- TABS ---
function setupTabs() {
  els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      els.tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      els.tabContents.forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
      if (tab === 'today') renderContacts();
    });
  });
}

// --- SETTINGS PERSISTENCE ---
const LS_PREFIX = 'copz_v3_';

function loadSettings() {
  const s = localStorage.getItem(LS_PREFIX + 'settings');
  if (s) {
    try {
      const parsed = JSON.parse(s);
      state.settings = { ...state.settings, ...parsed };
    } catch(e) {}
  }
  els.senderName.value = state.settings.senderName || '';
  els.senderRole.value = state.settings.senderRole || '';
  els.extraTitles.value = state.settings.extraTitles || '';
  els.csvEncoding.value = state.settings.csvEncoding || 'ISO-8859-1';
  els.antiBanDelay.value = state.settings.antiBanDelay || 3;

  // Carica contatti e onomastici da localStorage
  const vcf = localStorage.getItem(LS_PREFIX + 'vcf');
  if (vcf) {
    try {
      state.contacts = JSON.parse(vcf);
      state.vcfLoaded = state.contacts.length > 0;
      updateVcfStatus(state.contacts.length + ' contatti');
    } catch(e) {}
  }
  const csv = localStorage.getItem(LS_PREFIX + 'csv');
  if (csv) {
    try {
      state.onomastici = JSON.parse(csv);
      state.csvLoaded = state.onomastici.length > 0;
      updateCsvStatus(state.onomastici.length + ' voci');
    } catch(e) {}
  }
}

function saveSettings() {
  state.settings.senderName = els.senderName.value.trim();
  state.settings.senderRole = els.senderRole.value.trim();
  state.settings.extraTitles = els.extraTitles.value.trim();
  state.settings.csvEncoding = els.csvEncoding.value;
  state.settings.antiBanDelay = parseInt(els.antiBanDelay.value, 10) || 3;
  localStorage.setItem(LS_PREFIX + 'settings', JSON.stringify(state.settings));
}

function saveContacts() {
  localStorage.setItem(LS_PREFIX + 'vcf', JSON.stringify(state.contacts));
}

function saveOnomastici() {
  localStorage.setItem(LS_PREFIX + 'csv', JSON.stringify(state.onomastici));
}

function setupSettings() {
  [els.senderName, els.senderRole, els.extraTitles, els.csvEncoding, els.antiBanDelay].forEach(el => {
    el.addEventListener('change', () => {
      saveSettings();
      renderContacts();
    });
  });
  els.resetAll.addEventListener('click', () => {
    if (confirm('Sei sicuro di voler cancellare TUTTI i dati salvati?')) {
      localStorage.removeItem(LS_PREFIX + 'settings');
      localStorage.removeItem(LS_PREFIX + 'vcf');
      localStorage.removeItem(LS_PREFIX + 'csv');
      // Rimuovi anche stato invio
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_PREFIX + 'sent_')) localStorage.removeItem(k);
      }
      state.contacts = [];
      state.onomastici = [];
      state.vcfLoaded = false;
      state.csvLoaded = false;
      els.vcfFile.value = '';
      els.csvFile.value = '';
      updateVcfStatus('Nessun file caricato');
      updateCsvStatus('Nessun file caricato');
      renderContacts();
      showToast('Dati cancellati');
    }
  });
}

// --- FILE INPUTS ---
function setupFileInputs() {
  els.vcfFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    els.vcfError.classList.remove('visible');
    updateVcfStatus('Lettura in corso...');
    try {
      const result = await parseVCF(file);
      state.contacts = result.contacts;
      state.vcfLoaded = true;
      saveContacts();
      updateVcfStatus(result.count + ' contatti caricati ✓');
      showToast(result.count + ' contatti caricati');
      renderContacts();
    } catch (err) {
      console.error(err);
      updateVcfStatus('Errore nel caricamento', true);
      els.vcfError.textContent = err.message || 'Errore nel parsing VCF';
      els.vcfError.classList.add('visible');
      state.vcfLoaded = false;
    }
  });

  els.csvFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    els.csvError.classList.remove('visible');
    updateCsvStatus('Lettura in corso...');
    try {
      const enc = els.csvEncoding.value;
      const result = await parseCSV(file, enc);
      state.onomastici = result.entries;
      state.csvLoaded = true;
      saveOnomastici();
      updateCsvStatus(result.count + ' voci caricate ✓');
      showToast(result.count + ' onomastici caricati');
      renderContacts();
    } catch (err) {
      console.error(err);
      updateCsvStatus('Errore nel caricamento', true);
      els.csvError.textContent = err.message || 'Errore nel parsing CSV';
      els.csvError.classList.add('visible');
      state.csvLoaded = false;
    }
  });
}

function updateVcfStatus(text, isError) {
  els.vcfStatus.textContent = text;
  els.vcfStatus.className = 'file-status ' + (isError ? 'err' : (text.includes('✓') ? 'ok' : ''));
}

function updateCsvStatus(text, isError) {
  els.csvStatus.textContent = text;
  els.csvStatus.className = 'file-status ' + (isError ? 'err' : (text.includes('✓') ? 'ok' : ''));
}

// --- RENDERING ---
function getToday() {
  const d = new Date();
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

function getSentKey(contact, type) {
  const today = getToday();
  const dateStr = today.year + '-' + String(today.month).padStart(2, '0') + '-' + String(today.day).padStart(2, '0');
  const nameKey = normalizeForMatch(contact.fullName || 'unknown');
  return LS_PREFIX + 'sent_' + dateStr + '_' + nameKey + '_' + type;
}

function isSent(contact, type) {
  return localStorage.getItem(getSentKey(contact, type)) === '1';
}

function markSent(contact, type) {
  localStorage.setItem(getSentKey(contact, type), '1');
}

function getContactsForToday() {
  const today = getToday();
  const results = [];

  if (!state.vcfLoaded) return results;

  for (const contact of state.contacts) {
    const bday = matchCompleanno(contact, today);
    if (bday) {
      results.push({
        contact,
        type: 'compleanno',
        data: bday,
        sort: 0 // compleanni prima
      });
    }
    if (state.csvLoaded) {
      const onom = matchOnomastico(contact, state.onomastici, state.settings.extraTitles);
      if (onom) {
        results.push({
          contact,
          type: 'onomastico',
          data: onom,
          sort: 1 // onomastici dopo
        });
      }
    }
  }

  // Ordina: compleanni prima, poi per nome
  results.sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return (a.contact.fullName || '').localeCompare(b.contact.fullName || '');
  });

  return results;
}

function formatPhone(tel) {
  if (!tel) return '';
  if (tel.startsWith('+')) return tel;
  if (tel.startsWith('00')) return '+' + tel.substring(2);
  if (tel.startsWith('3')) return '+39' + tel;
  return tel;
}

function buildLink(type, tel, message) {
  const encoded = encodeURIComponent(message);
  const phone = formatPhone(tel);
  if (!phone) return null;

  if (type === 'wa') {
    return 'https://wa.me/' + phone.replace(/\+/g, '') + '?text=' + encoded;
  }
  if (type === 'tg') {
    // tg://msg funziona solo su mobile con app installata
    // Fallback: usiamo entrambi i formati
    return 'tg://msg?text=' + encoded + '&to=' + phone;
  }
  if (type === 'sms') {
    return 'sms:' + phone + '?body=' + encoded;
  }
  return null;
}

function renderContacts() {
  const list = getContactsForToday();
  const showOnlyPending = els.filterPending.checked;

  const filtered = showOnlyPending ? list.filter(item => !isSent(item.contact, item.type)) : list;

  const sentCount = list.filter(item => isSent(item.contact, item.type)).length;
  els.statsText.textContent = list.length > 0
    ? sentCount + '/' + list.length + ' inviati'
    : (state.vcfLoaded ? 'Nessun compleanno/onomastico oggi' : 'Carica la rubrica e il CSV onomastici');

  if (filtered.length === 0) {
    els.contactsList.innerHTML = `
      <div class="empty-state">
        <p>${list.length === 0 ? '📝 Nessun compleanno o onomastico oggi.' : '✅ Tutti i messaggi sono stati inviati!'}</p>
        ${!state.vcfLoaded ? '<p class="sub">Carica la rubrica e il CSV onomastici nelle Impostazioni.</p>' : ''}
      </div>`;
    return;
  }

  els.contactsList.innerHTML = '';
  for (const item of filtered) {
    const card = document.createElement('div');
    card.className = 'contact-card' + (isSent(item.contact, item.type) ? ' sent' : '');

    const typeLabel = item.type === 'compleanno' ? 'Compleanno' : 'Onomastico';
    const typeClass = item.type === 'compleanno' ? 'type-bday' : 'type-onom';
    const isComm = isCommemorative(item.contact);

    let ageText = '';
    if (item.type === 'compleanno' && item.data.age !== null) {
      ageText = item.data.age + ' anni';
    }

    const msg = generateMessage(item.contact, item.type, state.settings.senderName, state.settings.senderRole);
    const tel = item.contact.tels[0] || '';

    const waLink = buildLink('wa', tel, msg);
    const tgLink = buildLink('tg', tel, msg);
    const smsLink = buildLink('sms', tel, msg);

    const sent = isSent(item.contact, item.type);

    card.innerHTML = `
      <div class="contact-header">
        <div>
          <div class="contact-name">${escapeHtml(item.contact.fullName)}</div>
          ${ageText ? `<div class="contact-age">${ageText}</div>` : ''}
          ${tel ? `<div class="contact-phone">${escapeHtml(tel)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <span class="contact-type ${typeClass}">${typeLabel}</span>
          ${sent ? '<div class="sent-badge">✓ Inviato</div>' : ''}
        </div>
      </div>
      <div class="contact-preview">${escapeHtml(msg)}</div>
      <div class="contact-actions">
        ${tgLink ? `<a href="${tgLink}" class="btn-action btn-tg" data-type="tg" data-contact="${escapeHtml(item.contact.fullName)}" data-ctype="${item.type}">📨 TG</a>` : '<button class="btn-action btn-tg" disabled>📨 TG</button>'}
        ${waLink ? `<a href="${waLink}" class="btn-action btn-wa" data-type="wa" data-contact="${escapeHtml(item.contact.fullName)}" data-ctype="${item.type}">💬 WA</a>` : '<button class="btn-action btn-wa" disabled>💬 WA</button>'}
        ${smsLink ? `<a href="${smsLink}" class="btn-action btn-sms" data-type="sms" data-contact="${escapeHtml(item.contact.fullName)}" data-ctype="${item.type}">✉️ SMS</a>` : '<button class="btn-action btn-sms" disabled>✉️ SMS</button>'}
      </div>
    `;

    // Gestione click sui link
    const links = card.querySelectorAll('a.btn-action');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        if (isCooldownActive()) {
          e.preventDefault();
          showToast('Attendi il cooldown anti-ban...');
          return;
        }
        const cname = link.dataset.contact;
        const ctype = link.dataset.ctype;
        const ctype2 = link.dataset.type;
        // Trova il contatto originale
        const orig = item.contact;
        markSent(orig, ctype);
        startCooldown();
        // Aggiorna UI dopo un breve delay per permettere l'apertura del link
        setTimeout(() => renderContacts(), 300);
      });
    });

    els.contactsList.appendChild(card);
  }
}

// --- COOLDOWN / ANTI-BAN ---
function isCooldownActive() {
  return Date.now() < cooldownEnd;
}

function startCooldown() {
  const delayMs = (state.settings.antiBanDelay || 3) * 1000;
  cooldownEnd = Date.now() + delayMs;
  els.cooldownOverlay.classList.remove('hidden');

  function tick() {
    const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
    if (remaining <= 0) {
      els.cooldownSec.textContent = '0';
      els.cooldownOverlay.classList.add('hidden');
      return;
    }
    els.cooldownSec.textContent = remaining;
    requestAnimationFrame(() => {
      setTimeout(tick, 200);
    });
  }
  tick();
}

// --- UTILS ---
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimeout;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

// --- FILTER ---
els.filterPending.addEventListener('change', renderContacts);

// --- START ---
init();
