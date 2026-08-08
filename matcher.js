// ===== MATCHER =====

const BUILTIN_TITLES = [
  'dott\.','dottore','dottoressa','d\.ssa','dr\.','avv\.','avvocato',
  'ing\.','ingegnere','prof\.','professore','professoressa','sig\.','signore','signora',
  'sig\.ra','sigra','gen\.','generale','don','donna','mons\.','monsignore',
  'card\.','cardinale','fra','suor','sr\.','frate','padre','p\.','rev\.',
  'arch\.','architetto','geom\.','geometra','rag\.','ragioniere','cap\.','capt\.',
  'on\.','onorevole','sen\.','senatore','pres\.','presidente','vice','coord\.',
  'comm\.','commissario','dir\.','direttore','resp\.','responsabile'
];

function buildTitleRegex(extraTitles) {
  const all = [...BUILTIN_TITLES];
  if (extraTitles) {
    extraTitles.split(',').forEach(t => {
      const clean = t.trim().toLowerCase().replace(/\./g, '\.');
      if (clean) all.push(clean);
    });
  }
  return new RegExp('^(?:' + all.join('|') + ')\s*', 'gi');
}

function cleanName(name, extraTitles) {
  if (!name) return '';
  const regex = buildTitleRegex(extraTitles);
  return name.replace(regex, '').trim();
}

function getFirstName(fullName, extraTitles) {
  const cleaned = cleanName(fullName, extraTitles);
  // Prendi la prima parola, ma se è un iniziale (1-2 caratteri + punto), prendi la seconda
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return cleaned;
  if (words[0].length <= 2 && words[0].endsWith('.')) {
    return words[1] || words[0];
  }
  return words[0];
}

function normalizeForMatch(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u030f]/g, '') // rimuovi accenti
    .replace(/[^a-z]/g, '');
}

function matchOnomastico(contact, onomasticiDB, extraTitles) {
  const firstName = getFirstName(contact.fullName, extraTitles);
  if (!firstName) return null;
  const key = normalizeForMatch(firstName);
  for (const entry of onomasticiDB) {
    if (normalizeForMatch(entry.name) === key) {
      return entry;
    }
  }
  return null;
}

function parseBday(bday) {
  if (!bday) return null;
  // Formati: 1990-08-15, 19900815, 15-08-1990, 15/08/1990, --08-15
  const clean = bday.replace(/\D/g, '');
  if (clean.length === 8) {
    // YYYYMMDD o DDMMYYYY?
    const y = parseInt(clean.substring(0, 4), 10);
    if (y > 1800 && y < 2100) {
      return { day: parseInt(clean.substring(6, 8), 10), month: parseInt(clean.substring(4, 6), 10), year: y };
    }
    const y2 = parseInt(clean.substring(4, 8), 10);
    if (y2 > 1800 && y2 < 2100) {
      return { day: parseInt(clean.substring(0, 2), 10), month: parseInt(clean.substring(2, 4), 10), year: y2 };
    }
  }
  if (clean.length === 4) {
    // MMDD o DDMM?
    const a = parseInt(clean.substring(0, 2), 10);
    const b = parseInt(clean.substring(2, 4), 10);
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return { day: b, month: a, year: null };
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31) return { day: a, month: b, year: null };
  }
  // Prova con separatori
  const m = bday.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{0,4})?/);
  if (m) {
    const d1 = parseInt(m[1], 10);
    const d2 = parseInt(m[2], 10);
    const yr = m[3] ? parseInt(m[3], 10) : null;
    if (d1 >= 1 && d1 <= 31 && d2 >= 1 && d2 <= 12) {
      return { day: d1, month: d2, year: yr };
    }
    if (d2 >= 1 && d2 <= 31 && d1 >= 1 && d1 <= 12) {
      return { day: d2, month: d1, year: yr };
    }
  }
  return null;
}

function matchCompleanno(contact, today) {
  const parsed = parseBday(contact.bday);
  if (!parsed) return null;
  if (parsed.day === today.day && parsed.month === today.month) {
    let age = null;
    if (parsed.year) {
      age = today.year - parsed.year;
      if (today.month < parsed.month || (today.month === parsed.month && today.day < parsed.day)) {
        age--;
      }
    }
    return { day: parsed.day, month: parsed.month, year: parsed.year, age };
  }
  return null;
}

function isCommemorative(contact) {
  const check = (contact.note + ' ' + contact.categories.join(' ')).toUpperCase();
  return /\b(MORTO|MORTA|DEFUNTO|DEFUNTA|IN MEMORIA)\b/.test(check);
}
