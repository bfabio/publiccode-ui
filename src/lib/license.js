const SPDX_DATA_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/main/json';

const lists = {
  licenses: { file: 'licenses.json', key: 'licenses', idField: 'licenseId', promise: null },
  exceptions: { file: 'exceptions.json', key: 'exceptions', idField: 'licenseExceptionId', promise: null },
};

// Maps the lowercased id to the canonical id and name, since SPDX
// matches ids case insensitively.
function fetchList(list) {
  if (!list.promise) {
    list.promise = (async () => {
      const res = await fetch(`${SPDX_DATA_URL}/${list.file}`);
      const json = await res.json();
      return new Map(json[list.key].map((l) => [l[list.idField].toLowerCase(), { id: l[list.idField], name: l.name }]));
    })().catch(() => {
      // Clear so the next render retries: caching a failed fetch would
      // strip every license URL for the process lifetime.
      list.promise = null;
      return new Map();
    });
  }
  return list.promise;
}

const spdxUrl = (id) => `https://spdx.org/licenses/${id}.html`;

// Splits an SPDX license expression into ids, operators and
// parentheses. Returns null when the value is not a valid expression,
// such as "MIT License", so that it is shown as written.
function parseExpression(value) {
  const tokens = value.match(/[()]|[^\s()]+/g) ?? [];
  let pos = 0;
  const out = [];

  const isOperator = (tok) => /^(AND|OR|WITH)$/.test(tok) || /^(and|or|with)$/.test(tok);
  const isId = (tok) => tok !== undefined && tok !== '(' && tok !== ')' && !isOperator(tok)
    && /^[A-Za-z0-9.\-:]+\+?$/.test(tok);

  function term() {
    if (tokens[pos] === '(') {
      out.push({ op: '(' });
      pos++;
      if (!compound() || tokens[pos] !== ')') return false;
      out.push({ op: ')' });
      pos++;
      return true;
    }
    if (!isId(tokens[pos])) return false;
    out.push({ license: tokens[pos++] });
    if (tokens[pos]?.toUpperCase() === 'WITH' && isOperator(tokens[pos])) {
      pos++;
      if (!isId(tokens[pos]) || tokens[pos].endsWith('+')) return false;
      out.push({ op: ' WITH ' }, { exception: tokens[pos++] });
    }
    return true;
  }

  function compound() {
    if (!term()) return false;
    while (/^(AND|OR)$/i.test(tokens[pos] ?? '') && isOperator(tokens[pos])) {
      out.push({ op: ` ${tokens[pos++].toUpperCase()} ` });
      if (!term()) return false;
    }
    return true;
  }

  return compound() && pos === tokens.length ? out : null;
}

function lookupLicense(map, token) {
  const exact = map.get(token.toLowerCase());
  if (exact) return { text: exact.id, url: spdxUrl(exact.id), name: exact.name };
  if (token.endsWith('+')) {
    const base = map.get(token.slice(0, -1).toLowerCase());
    if (base) return { text: `${base.id}+`, url: spdxUrl(base.id) };
  }
  return { text: token, url: null };
}

// Resolves legal.license into display parts: each known SPDX id is
// linked to its page with the canonical id as text. A value made of a
// single known license also gets its full name and URL.
export async function resolveLicense(value) {
  if (!value) return null;

  const expression = parseExpression(String(value).trim());
  if (!expression) {
    return { id: value, name: value, url: null, parts: [{ text: value, url: null }] };
  }

  const [licenses, exceptions] = await Promise.all([fetchList(lists.licenses), fetchList(lists.exceptions)]);

  const parts = [];
  let single = null;
  for (const node of expression) {
    let part;
    if (node.license) {
      part = lookupLicense(licenses, node.license);
      if (expression.length === 1 && part.name) single = part;
    } else if (node.exception) {
      const exc = exceptions.get(node.exception.toLowerCase());
      part = exc ? { text: exc.id, url: spdxUrl(exc.id) } : { text: node.exception, url: null };
    } else {
      part = { text: node.op, url: null };
    }
    const last = parts[parts.length - 1];
    if (!part.url && last && !last.url) last.text += part.text;
    else parts.push({ text: part.text, url: part.url });
  }

  const id = parts.map((p) => p.text).join('');
  return { id, name: single?.name ?? id, url: single?.url ?? null, parts };
}
