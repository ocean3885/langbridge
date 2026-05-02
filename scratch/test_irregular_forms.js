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

  const prompt = `당신은 스페인어 전문가입니다. 입력된 단어 '${word}'의 사전적 원형(Lemma)을 찾고, 그 원형에 대한 데이터를 JSON으로 생성하세요.
  
[중요] 사용자가 활용형(예: 'fui', 'duerm스')을 입력하더라도 'word' 필드에는 반드시 그 단어의 사전적 원형(예: 'ir', 'dormir')을 적어야 합니다.

### [출력 스키마]
{
  "word": "사전적 원형",
  "pos": ["품사"],
  "meaning": { "품사": "한국어 뜻" },
  "gender": "m/f/mf/null",
  "conjugations": {
    "pres": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    ...
  }
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
  // 어려운 불규칙 활용형들
  // 1. fui (ir 또는 ser의 과거형)
  // 2. duerma (dormir의 접속법 현재)
  // 3. quise (querer의 단순과거 1인칭)
  const irregularForms = ['fui', 'duerma', 'quise'];
  const results = [];

  for (const form of irregularForms) {
    console.log(`Testing irregular form: ${form}...`);
    const info = await generateWordInfoDeepseek(form);
    results.push({
      input: form,
      extracted_lemma: info.word,
      info
    });
  }

  fs.writeFileSync(path.join(__dirname, 'irregular_test_results.json'), JSON.stringify(results, null, 2));
  console.log('Irregular test results saved.');
}

testGenerator();
