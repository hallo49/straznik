// Serverless function (Vercel). Holds the Anthropic API key server-side —
// the key is never sent to the browser. Accepts either a base64 image or
// pasted text (or both) and returns a JSON verdict for the "Strażnik"
// senior scam-detection app.

const SHARED_RULES = [
  'Jesteś pomocnikiem chroniącym osoby starsze przed oszustwami — np. "oszustwem na wnuczka", "na policjanta", fałszywymi SMS-ami o przesyłkach lub dopłatach, fałszywymi linkami bankowymi, fałszywymi wygranymi, presją "działaj natychmiast", prośbami o dane karty, kod BLIK czy przelew.',
  'Pisz BARDZO prostym, ciepłym językiem, bez żargonu technicznego i bez słowa "AI" — jakbyś tłumaczył to swojej babci.',
  'Zwróć uwagę na: presję czasu, prośby o pieniądze lub kod BLIK, podszywanie się pod bliską osobę / policję / bank / kuriera, podejrzane linki, żądanie danych osobowych lub kodów.',
  'Jeśli treść jest zwyczajna i nie ma żadnych z tych sygnałów (np. wiadomość od rodziny bez próśb o pieniądze, zwykła reklama), zwróć werdykt "bezpieczne".',
  'Jeśli treść jest zbyt uboga, żeby ocenić, zwróć werdykt "brak_danych" i napisz wprost, że lepiej dopytać kogoś zaufanego.',
  'Odpowiedz WYŁĄCZNIE jednym obiektem JSON, bez żadnego innego tekstu, w tym dokładnym kształcie:',
  '{"werdykt": "bezpieczne" | "uwazaj" | "oszustwo" | "brak_danych", "tytul": "krótki tytuł po polsku, prosty język, do 8 słów", "wyjasnienie": "2-3 proste zdania po polsku, ciepłym tonem, tłumaczące dlaczego", "sygnaly": ["1-4 krótkie sygnały ostrzegawcze prostym językiem, puste jeśli brak"], "rekomendacja": "1-2 konkretne, proste zdania co teraz zrobić — np. zadzwoń do wnuka na znany numer, nie wysyłaj pieniędzy, nie klikaj linku"}'
].join(' ');

// Very small in-memory rate limit per server instance — blunts accidental
// abuse while testing, NOT a substitute for real rate limiting before a
// public launch (see README).
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'server_misconfigured', detail: 'Brak ANTHROPIC_API_KEY w zmiennych środowiskowych.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const { image, mimeType, text } = body || {};

  if (!image && (!text || !text.trim())) {
    res.status(400).json({ error: 'missing_input' });
    return;
  }

  const content = [];
  if (image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mimeType || 'image/png', data: image }
    });
    content.push({ type: 'text', text: 'Obejrzyj załączone zdjęcie lub zrzut ekranu wiadomości. ' + SHARED_RULES });
  } else {
    content.push({ type: 'text', text: 'Oceń poniższą wklejoną wiadomość:\n\n---\n' + text.slice(0, 6000) + '\n---\n\n' + SHARED_RULES });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content }]
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: 'upstream_error', detail });
      return;
    }

    const data = await upstream.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      res.status(502).json({ error: 'empty_completion' });
      return;
    }

    const raw = textBlock.text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed;
    try {
      parsed = JSON.parse(match ? match[0] : raw);
    } catch (e) {
      res.status(502).json({ error: 'invalid_json', raw });
      return;
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e) });
  }
};
