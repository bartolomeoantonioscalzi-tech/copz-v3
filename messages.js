// ===== MESSAGES =====

const VARIANTS_STANDARD = [
  'Tanti auguri di buon compleanno',
  'Auguri per il tuo compleanno',
  'Buon compleanno e tanti auguri',
  'Tanti cari auguri di buon compleanno',
  'Felice compleanno, tanti auguri'
];

const VARIANTS_ONOMASTICO = [
  'Tanti auguri di buon onomastico',
  'Auguri per il tuo onomastico',
  'Buon onomastico e tanti auguri',
  'Tanti cari auguri di buon onomastico',
  'Felice onomastico, tanti auguri'
];

const VARIANTS_COMMEMORATIVE = [
  'In questo giorno speciale ti ricordo con affetto',
  'Oggi ricordo con gioia il tuo compleanno',
  'Un pensiero speciale per te in questo giorno',
  'Nel ricordo del tuo compleanno, un abbraccio',
  'Oggi ti ricordo con un sorriso e tanto affetto'
];

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getVariantIndex(contactId, type, totalVariants) {
  // Rotazione basata su: giorno dell'anno + hash del nome
  const today = new Date();
  const doy = getDayOfYear(today);
  let hash = 0;
  for (let i = 0; i < contactId.length; i++) {
    hash = ((hash << 5) - hash) + contactId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs((doy + hash) % totalVariants);
  return idx;
}

function generateMessage(contact, type, senderName, senderRole) {
  const isComm = isCommemorative(contact);
  let variant;
  const contactId = contact.fullName || 'unknown';

  if (type === 'compleanno') {
    if (isComm) {
      const idx = getVariantIndex(contactId, 'comm', VARIANTS_COMMEMORATIVE.length);
      variant = VARIANTS_COMMEMORATIVE[idx];
    } else {
      const idx = getVariantIndex(contactId, 'bday', VARIANTS_STANDARD.length);
      variant = VARIANTS_STANDARD[idx];
    }
  } else {
    const idx = getVariantIndex(contactId, 'onom', VARIANTS_ONOMASTICO.length);
    variant = VARIANTS_ONOMASTICO[idx];
  }

  const firstName = getFirstName(contact.fullName, '');
  let msg = variant;
  if (firstName) {
    msg += ', ' + firstName;
  }
  msg += '!';

  if (senderName) {
    msg += ' Da ' + senderName;
    if (senderRole) {
      msg += ', ' + senderRole;
    }
    msg += '.';
  }

  return msg;
}
