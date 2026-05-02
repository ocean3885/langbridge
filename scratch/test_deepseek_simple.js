const fs = require('fs');
const path = require('path');

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

function normalizeConjugations(val) {
  const keys = ['s1', 's2', 's3', 'p1', 'p2', 'p3'];
  const result = {};

  if (Array.isArray(val)) {
    const flat = val.flat();
    keys.forEach((key, i) => {
      result[key] = flat[i] || "";
    });
  } else if (typeof val === 'object' && val !== null) {
    const personMap = {
      'yo': 's1', 'tú': 's2', 'tu': 's2', 'él': 's3', 'el': 's3', 'ella': 's3', 'usted': 's3',
      'nosotros': 'p1', 'nosotras': 'p1', 'vosotros': 'p2', 'vosotras': 'p2',
      'ellos': 'p3', 'ellas': 'p3', 'ustedes': 'p3'
    };

    Object.entries(val).forEach(([k, v]) => {
      const normalizedKey = personMap[k.toLowerCase()] || k.toLowerCase();
      if (keys.includes(normalizedKey)) {
        result[normalizedKey] = String(v);
      }
    });

    keys.forEach(k => { if (!result[k]) result[k] = ""; });
  } else if (typeof val === 'string') {
    const parts = val.split(',').map(s => s.trim());
    keys.forEach((key, i) => {
      result[key] = parts[i] || "";
    });
  }

  return result;
}

async function generateWordInfoDeepseek(word) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  const prompt = `당신은 스페인어 전문가입니다. 단어 '${word}'에 대한 데이터를 JSON으로 생성하세요.
{
  "word": "원형",
  "pos": ["품사"],
  "meaning": { "품사": "한국어 뜻" },
  "gender": "m/f/mf/null",
  "conjugations": {
    "pres": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    ...
  },
  "declensions": { "ms": "...", "mp": "...", "fs": "...", "fp": "..." }
}`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "스페인어 교육 전문가로서 JSON 형식으로만 응답하세요." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      stream: false
    })
  });

  const result = await response.json();
  const rawData = JSON.parse(result.choices[0].message.content);

  if (rawData.conjugations && typeof rawData.conjugations === 'object') {
    const normalizedConjugations = {};
    for (const tense of Object.keys(rawData.conjugations)) {
      normalizedConjugations[tense] = normalizeConjugations(rawData.conjugations[tense]);
    }
    rawData.conjugations = normalizedConjugations;
  }

  return rawData;
}

async function testGenerator() {
  const words = ['casa', 'comer', 'bonito'];
  const results = [];
  for (const word of words) {
    console.log(`Generating for: ${word}...`);
    const info = await generateWordInfoDeepseek(word);
    results.push(info);
  }
  fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(results, null, 2));
  console.log('Results saved.');
}

testGenerator();
