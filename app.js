const MASTODON = 'https://mastodon.social';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';
const TOP_N = 3;

const SYSTEM_PROMPT = `You suggest Mastodon hashtag candidates for a user's post.

Given the post text, output a JSON array of 8-15 candidate hashtag strings (no '#' prefix, no spaces). Include:
- Direct topic tags (e.g., AIMusic, Photography)
- Common spelling variants (e.g., AITunes, GenerativeMusic)
- Related broader tags people browse (e.g., AIArt, Music)
- Common community tags if applicable (e.g., FediArt, MastoArt)

Use the casing people typically write on Mastodon (CamelCase for multi-word tags, lowercase for single words is also fine).

Output ONLY the JSON array. No prose, no markdown, no code fences. Example output:
["AIMusic","AITunes","SunoAI","GenerativeMusic","AIArt","Music","ElectronicMusic","FediMusic"]`;

const $ = (id) => document.getElementById(id);
const apiKeyInput = $('api-key');
const postInput = $('post');
const goBtn = $('go');
const statusEl = $('status');
const outputSection = $('output-section');
const resultEl = $('result');
const copyBtn = $('copy');
const candidatesEl = $('candidates');

apiKeyInput.value = localStorage.getItem('anthropic_api_key') || '';
apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('anthropic_api_key', apiKeyInput.value.trim());
});

goBtn.addEventListener('click', run);
copyBtn.addEventListener('click', () => {
  resultEl.select();
  navigator.clipboard.writeText(resultEl.value);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
});

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
}

function stripHashtags(text) {
  return text.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1').replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

async function extractCandidates(post, apiKey) {
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Post:\n\n${post}` }],
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Claude API ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = data.content.find((b) => b.type === 'text')?.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Could not parse JSON from Claude response: ${text.slice(0, 200)}`);
  const arr = JSON.parse(match[0]);
  return arr.filter((s) => typeof s === 'string' && /^[\p{L}\p{N}_]+$/u.test(s));
}

async function lookupVolume(tag) {
  try {
    const resp = await fetch(`${MASTODON}/api/v1/tags/${encodeURIComponent(tag)}`);
    if (!resp.ok) return { tag, uses: 0, accounts: 0, missing: true };
    const data = await resp.json();
    const week = (data.history || []).slice(0, 7);
    const uses = week.reduce((s, d) => s + Number(d.uses || 0), 0);
    const accounts = week.reduce((s, d) => s + Number(d.accounts || 0), 0);
    return { tag: data.name || tag, uses, accounts, missing: false };
  } catch {
    return { tag, uses: 0, accounts: 0, missing: true };
  }
}

async function run() {
  const apiKey = apiKeyInput.value.trim();
  const post = postInput.value.trim();
  if (!apiKey) return setStatus('Add your Anthropic API key in Settings first.', true);
  if (!post) return setStatus('Write a post first.', true);

  goBtn.disabled = true;
  outputSection.hidden = true;
  candidatesEl.innerHTML = '';
  setStatus('Asking Claude for candidate tags…');

  try {
    const cleanPost = stripHashtags(post);
    const candidates = await extractCandidates(cleanPost, apiKey);
    if (candidates.length === 0) throw new Error('No candidates returned.');

    setStatus(`Looking up ${candidates.length} tag volumes on mastodon.social…`);
    const volumes = await Promise.all(candidates.map(lookupVolume));
    const ranked = volumes.sort((a, b) => b.uses - a.uses);
    const picked = ranked.slice(0, TOP_N);

    for (const v of ranked) {
      const li = document.createElement('li');
      li.textContent = `#${v.tag} — ${v.uses} uses, ${v.accounts} accounts (7d)${v.missing ? ' [not found]' : ''}`;
      if (picked.includes(v)) li.classList.add('picked');
      candidatesEl.appendChild(li);
    }

    const tagLine = picked.map((v) => `#${v.tag}`).join(' ');
    resultEl.value = `${cleanPost}\n\n${tagLine}`;
    outputSection.hidden = false;
    setStatus(`Done. Top ${picked.length} appended.`);
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    goBtn.disabled = false;
  }
}
