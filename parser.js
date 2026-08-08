// ===== PARSER VCF ROBUSTO =====
const DEFAULT_TITLES = [
  'dott\.','dottore','dottoressa','d\.ssa','dr\.','avv\.','avvocato',
  'ing\.','ingegnere','prof\.','professore','professoressa','sig\.','signore','signora',
  'sig\.ra','sigra','gen\.','generale','don','donna','mons\.','monsignore',
  'card\.','cardinale','fra','suor','sr\.','frate','padre','p\.','rev\.',
  'arch\.','architetto','geom\.','geometra','rag\.','ragioniere','cap\.','capt\.',
  'on\.','onorevole','sen\.','senatore','pres\.','presidente','vice','coord\.',
  'comm\.','commissario','dir\.','direttore','resp\.','responsabile'
];

function normalizeText(str) {
  if (!str) return '';
  return str
    .replace(/\n/g, '\n')
    .replace(/\,/g, ',')
    .replace(/\;/g, ';')
    .replace(/\\/g, '\\');
}

function decodeQuotedPrintable(input) {
  return input.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseVcfContent(text) {
  const lines = text.split(/\r?\n/);
  const contacts = [];
  let current = null;
  let pendingLine = '';

  function flushContact() {
    if (!current) return;
    let fullName = current.fn || '';
    if (!fullName && current.n) {
      const parts = current.n.split(';');
      fullName = [parts[1], parts[0]].filter(Boolean).join(' ').trim();
    }
    if (!fullName && current.tels.length > 0) {
      fullName = 'Sconosciuto';
    }
    if (fullName) {
      contacts.push({
        fullName: fullName.trim(),
        name: current.n || '',
        tels: current.tels,
        bday: current.bday || '',
        categories: current.categories || [],
        note: current.note || '',
        raw: current
      });
    }
  }

  for (let rawLine of lines) {
    if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) {
      pendingLine += rawLine.substring(1);
      continue;
    }
    if (pendingLine) {
      rawLine = pendingLine + rawLine;
      pendingLine = '';
    }
    const line = rawLine.trim();
    if (!line) continue;

    if (line.toUpperCase() === 'BEGIN:VCARD') {
      current = { fn: '', n: '', tels: [], bday: '', categories: [], note: '' };
      continue;
    }
    if (line.toUpperCase() === 'END:VCARD') {
      flushContact();
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const propFull = line.substring(0, idx).toUpperCase();
    let value = line.substring(idx + 1);

    if (propFull.includes('ENCODING=QUOTED-PRINTABLE')) {
      value = decodeQuotedPrintable(value);
    }

    const prop = propFull.split(';')[0];

    if (prop === 'FN') {
      current.fn = normalizeText(value).trim();
    } else if (prop === 'N') {
      current.n = normalizeText(value).trim();
    } else if (prop === 'TEL') {
      const clean = value.replace(/[^0-9+]/g, '');
      if (clean) current.tels.push(clean);
    } else if (prop === 'BDAY') {
      current.bday = value.trim();
    } else if (prop === 'CATEGORIES') {
      current.categories = value.split(',').map(s => s.trim().toUpperCase());
    } else if (prop === 'NOTE' || prop === 'X-NOTE') {
      current.note = normalizeText(value).trim();
    }
  }

  return contacts;
}

async function parseVCF(file) {
  const encodings = ['UTF-8', 'ISO-8859-1', 'Windows-1252'];
  let lastError = null;
  const buf = await file.arrayBuffer();

  for (const enc of encodings) {
    try {
      const decoder = new TextDecoder(enc, { fatal: false });
      const text = decoder.decode(buf);
      const contacts = parseVcfContent(text);
      if (contacts.length > 0) {
        return { contacts, encoding: enc, count: contacts.length };
      }
      lastError = new Error('Nessun contatto trovato con encoding ' + enc);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Impossibile parsare il file VCF. Verifica che sia un file .vcf valido.');
}

// ===== PARSER CSV ROBUSTO =====
function parseCSVContent(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  const seen = new Map();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    let name, day, month, desc;

    // Prova formato virgola: NOME,GG,MM,descrizione
    const commaParts = line.split(',');
    if (commaParts.length >= 3) {
      name = commaParts[0].trim();
      day = parseInt(commaParts[1].trim(), 10);
      month = parseInt(commaParts[2].trim(), 10);
      desc = commaParts[3] ? commaParts[3].trim() : '';
    } else {
      // Fallback formato punto e virgola: NOME;GG-MM
      const semiParts = line.split(';');
      if (semiParts.length >= 2) {
        name = semiParts[0].trim();
        const dateParts = semiParts[1].split('-');
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10);
        desc = semiParts[2] ? semiParts[2].trim() : '';
      }
    }

    if (name && !isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const key = name.toUpperCase();
      seen.set(key, { name, day, month, desc });
    }
  }

  for (const v of seen.values()) {
    entries.push(v);
  }

  return entries;
}

async function parseCSV(file, encoding) {
  const buf = await file.arrayBuffer();
  const decoder = new TextDecoder(encoding || 'ISO-8859-1', { fatal: false });
  const text = decoder.decode(buf);
  const entries = parseCSVContent(text);
  if (entries.length === 0) {
    throw new Error('Nessuna voce onomastica trovata. Verifica il formato (NOME,GG,MM,descrizione).');
  }
  return { entries, count: entries.length };
}
