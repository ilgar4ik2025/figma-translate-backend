export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const {
      texts,
      sourceLang,
      targetLangs,
      asoMode = 'neutral',
      glossary = {},
      presetKey = 'GLOBAL'
    } = req.body;

    if (!texts?.length) throw new Error('texts are required');
    if (!sourceLang) throw new Error('sourceLang is required');
    if (!Array.isArray(targetLangs) || !targetLangs.length) {
      throw new Error('targetLangs are required');
    }

    /* ================= PRESETS ================= */

    const PRESETS = {
      GLOBAL: { limits: { DE: 0.9, FR: 0.95, JA: 0.7, KO: 0.75, ZH: 0.7 } },
      EU: { limits: { DE: 0.85, FR: 0.9, ES: 0.95, IT: 0.95 } },
      JAPAN: { limits: { JA: 0.6 } },
      KOREA: { limits: { KO: 0.65 } }
    };

    const preset = PRESETS[presetKey] || PRESETS.GLOBAL;

    /* ================= GLOSSARY ================= */

    const protectedGlossary = {
      MoodVibe: 'MoodVibe',
      'Mental health': 'Mental health'
    };

    const finalGlossary = { ...protectedGlossary, ...glossary };

    /* ================= ASO MODE PROMPTS ================= */

    const ASO_RULES = {
      neutral: `
STYLE:
- Clear, neutral UI translation
- No unnecessary shortening
`,
      short: `
STYLE (SHORT UI MODE):
- This is a SCREENSHOT headline, NOT body text
- Max 2 lines
- Max 6–7 words
- ONE idea only
- NO explanations
- NO secondary clauses
- Rewrite aggressively to fit
- If too long → simplify meaning, not expand
`,
      marketing: `
STYLE (MARKETING):
- Emotional but concise
- App Store screenshot style
- Short punchy phrases
`
    };

    /* ================= TRANSLATION ================= */

    const results = {};

    for (const lang of targetLangs) {
      const limit = preset.limits[lang] || 1;
      const isJA = lang === 'JA';
      const isKO = lang === 'KO';

      const prompt = `
You are a STRICT localization engine for App Store screenshots.

ABSOLUTE RULES:
- ALL input texts are written in ${sourceLang}
- Translate ONLY from ${sourceLang} to ${lang}
- DO NOT detect language
- DO NOT add, remove, merge or reorder items
- Each [[[n]]] is a SEPARATE UI TEXT BLOCK
- Output MUST fit screenshot UI
- Target length ≤ ${Math.round(limit * 100)}%

${ASO_RULES[asoMode] || ASO_RULES.neutral}

${isJA ? `
JAPANESE RULES:
- No polite forms (no です / ます)
- Short noun phrases
- Typical App Store JP style
` : ''}

${isKO ? `
KOREAN RULES:
- No polite endings
- Concise noun phrases
- App Store style
` : ''}

GLOSSARY (STRICT — NEVER TRANSLATE):
${JSON.stringify(finalGlossary, null, 2)}

RETURN FORMAT:
Use markers [[[n]]] exactly.
NO extra text.

INPUT:
${texts.map((t, i) => `[[[${i}]]] ${t}`).join('\n')}
`;

      const r = await fetch('https://api.cometapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.COMET_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'chatgpt-4o-latest',
          temperature: asoMode === 'marketing' ? 0.4 : 0.15,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const json = await r.json();
      const raw = json.choices?.[0]?.message?.content || '';

      const translated = Array(texts.length).fill('');
      const regex = /\[\[\[(\d+)\]\]\]\s*([\s\S]*?)(?=\[\[\[|$)/g;

      let m;
      while ((m = regex.exec(raw)) !== null) {
        translated[parseInt(m[1], 10)] = m[2].trim();
      }

      if (translated.some(t => !t)) {
        throw new Error(`Incomplete translation for ${lang}`);
      }

      results[lang] = translated;
    }

    res.status(200).json({ allTranslations: results });

  } catch (e) {
    console.error('TRANSLATION ERROR:', e);
    res.status(500).json({ error: e.message });
  }
}
