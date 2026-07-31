import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { isMemoryMode, getPool, getMemoryCategories, addMemoryRecord } from '../lib/db.js';

const router = Router();

function parseCategory(r) {
  return {
    ...r,
    track_record: typeof r.track_record === 'string' ? JSON.parse(r.track_record) : r.track_record,
    keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords) : r.keywords
  };
}

router.post('/', async (req, res) => {
  const { announcement_title, agency, spec_text } = req.body;

  if (!announcement_title || !spec_text) {
    return res.status(400).json({ error: '공고명과 규격서 내용은 필수입니다.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI API 키가 설정되지 않았습니다. Vercel 환경변수에 ANTHROPIC_API_KEY를 추가하세요.' });
  }

  try {
    let categories;
    if (isMemoryMode()) {
      categories = getMemoryCategories();
    } else {
      const { rows } = await getPool().query('SELECT * FROM product_categories ORDER BY id');
      categories = rows.map(parseCategory);
    }

    const categoryContext = categories.map(c =>
      `[제품군: ${c.name}]\n- 대표 제품/스펙: ${c.specs}\n- 적용 이력: ${c.track_record.join(', ')}\n- 매칭 키워드: ${c.keywords.join(', ')}`
    ).join('\n\n');

    const systemPrompt = `당신은 ㈜리얼게인의 K-PRO 공고 스크리닝 AI 도우미입니다.
리얼게인은 원자력발전소 계측제어(I&C) 전문 기업으로, 아래 제품군을 보유하고 있습니다.

${categoryContext}

[판정 기준]
- "적합": 공고의 핵심 스펙이 보유 제품군의 스펙·인증등급과 명확히 일치하거나, 동일/유사 설비에 대한 기존 수주 이력이 있는 경우
- "보류": 유사 제품군은 보유하고 있으나 세부 스펙 정보가 부족해 판단이 애매한 경우 → 담당자 재검토 필요
- "제외": 리얼게인이 보유하지 않은 제품군(예: 밸브 액추에이터 등 비제조 품목)이거나 명백히 무관한 공고

[중요 원칙]
- 애매하면 "제외"가 아니라 "보류"로 판정하세요 (기회 손실 방지가 우선)
- 판정 근거에서 리얼게인 보유 제품명·수주 이력을 구체적으로 인용하세요
- 반드시 아래 JSON 스키마로만 응답하세요. 다른 텍스트는 포함하지 마세요.

응답 JSON 스키마:
{
  "verdict": "적합 | 보류 | 제외",
  "reasoning": "판정 근거 2~4문장",
  "matched_category": "매칭된 제품군명 또는 null",
  "confidence": "상 | 중 | 하"
}`;

    const userMessage = `[공고 정보]\n공고명: ${announcement_title}\n발주처: ${agency || '한국수력원자력'}\n\n[규격서 내용]\n${spec_text}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = response.content[0].text.trim();
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON not found');
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(422).json({ error: '판정 결과를 해석하지 못했습니다. 다시 시도해주세요.', raw: text });
    }

    if (!['적합', '보류', '제외'].includes(result.verdict)) {
      return res.status(422).json({ error: '잘못된 판정 결과입니다.', raw: text });
    }

    let matchedCategoryId = null;
    if (result.matched_category) {
      const cat = categories.find(c => c.name === result.matched_category);
      if (cat) matchedCategoryId = cat.id;
    }

    if (isMemoryMode()) {
      const saved = addMemoryRecord({
        announcement_title,
        agency: agency || '한국수력원자력',
        spec_text,
        verdict: result.verdict,
        reasoning: result.reasoning,
        matched_category_id: matchedCategoryId,
        confidence: result.confidence
      });
      return res.json(saved);
    }

    const pool = getPool();
    const inserted = await pool.query(
      `INSERT INTO screening_records (announcement_title, agency, spec_text, verdict, reasoning, matched_category_id, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [announcement_title, agency || '한국수력원자력', spec_text, result.verdict, result.reasoning, matchedCategoryId, result.confidence]
    );

    const { rows: savedRows } = await pool.query(
      `SELECT r.*, c.name as matched_category_name FROM screening_records r LEFT JOIN product_categories c ON r.matched_category_id = c.id WHERE r.id = $1`,
      [inserted.rows[0].id]
    );
    res.json(savedRows[0]);
  } catch (err) {
    if (err.status === 401) return res.status(500).json({ error: 'AI API 키가 유효하지 않습니다.' });
    console.error('AI 분석 오류:', err);
    res.status(500).json({ error: 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.' });
  }
});

export default router;
