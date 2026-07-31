import { Pool } from '@neondatabase/serverless';

let pool;
let useMemory = false;
let memoryCategories = [];
let memoryRecords = [];
let nextCatId = 1;
let nextRecId = 1;

const seedData = [
  { name: '방사선감시설비(RMS)', specs: 'Waste Liquid RMS, SGLM(N-16), Boron 농도감시(BCMS), Area/Process Radiation Monitoring System, Gaseous/Liquid Effluent Monitoring System, Main Steam Line Radiation Monitoring, Containment High Range Area Monitor', track_record: ['한빛 3·4·5·6호기','한울 1~6호기','고리 2·3·4호기','월성 1~4호기','새울 1·2호기'], keywords: ['RMS','방사선감시','N-16','Liquid RMS','Boron','BCMS','SGLM','방사선','방사능','방사선감시설비','환경방사선','Area Monitor','Process Monitor','배기감시','배수감시','주증기관','MSLRM'] },
  { name: '내방사선 CCTV', specs: '세계 최초 내방사선 Color CCTV(격납건물·사용후연료저장조용), 고방사선 환경(10^7 Rad 이상) 내구성, Pan/Tilt/Zoom 원격제어, 격납건물 내부 감시, 사용후연료저장조(SFP) 수중 감시카메라', track_record: ['국내 다수 원전','한빛 원전','한울 원전','고리 원전','월성 원전'], keywords: ['CCTV','카메라','내방사선','격납건물 감시','사용후연료','SFP','수중카메라','방사선카메라','Color CCTV','감시카메라','원격감시'] },
  { name: '전자카드 진단장비', specs: 'PIN POINT 전자카드 시험장비, 광격리카드(Fiber Optic Isolation Card), PCM(Power Control Module) 진단기, 제어시스템 전자카드 현장 진단 및 정비, 아날로그/디지털 카드 종합 시험', track_record: ['월성 1~4호기','한빛 1~6호기','한울 1~6호기','고리 2~4호기','새울 1·2호기'], keywords: ['전자카드','카드 진단','PCM','광격리카드','PIN POINT','전자카드 시험','Fiber Optic','제어카드','계측카드'] },
  { name: '제어봉 계통 진단장비', specs: 'CEDM 코일진단장비, CEDMCS Simulator, DRPI(Digital Rod Position Indication) 진단, ACTM(AC Timing Module) 센서, 제어봉구동장치(CEDM) 계통 종합진단, RPCS 성능시험장비', track_record: ['한빛 3~6호기','한울 1~6호기','월성 원전','고리 원전'], keywords: ['제어봉','코일진단','CEDMCS','DRPI','ACTM','CEDM','제어봉구동','RPCS','코일저항','제어봉 계통'] },
  { name: '정비용역', specs: '제어봉/PCS/ASTS/RMS 설비 정비, 계획예방정비, 비계획정비, 성능시험, 설비 건전성 평가, 원전 I&C(계측제어) 설비 전반 정비용역', track_record: ['국내 원전 전반','한빛 원전','한울 원전','고리 원전','월성 원전','새울 원전'], keywords: ['정비','정비용역','PCS','ASTS','계획예방정비','성능시험','설비정비','I&C','계측제어','건전성평가'] }
];

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL_NON_POOLING;

  if (!dbUrl) {
    useMemory = true;
    if (memoryCategories.length === 0) {
      const now = new Date().toISOString();
      memoryCategories = seedData.map(s => ({
        id: nextCatId++,
        name: s.name,
        specs: s.specs,
        track_record: s.track_record,
        keywords: s.keywords,
        created_at: now,
        updated_at: now
      }));
    }
    return;
  }

  pool = new Pool({ connectionString: dbUrl });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      specs TEXT NOT NULL DEFAULT '',
      track_record TEXT NOT NULL DEFAULT '[]',
      keywords TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS screening_records (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      announcement_title TEXT NOT NULL,
      agency TEXT NOT NULL DEFAULT '한국수력원자력',
      spec_text TEXT NOT NULL,
      verdict TEXT NOT NULL CHECK (verdict IN ('적합','보류','제외')),
      reasoning TEXT NOT NULL DEFAULT '',
      matched_category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
      confidence TEXT CHECK (confidence IN ('상','중','하')),
      shared_at TIMESTAMP
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM product_categories');
  if (Number(rows[0].cnt) === 0) {
    for (const s of seedData) {
      await pool.query(
        'INSERT INTO product_categories (name, specs, track_record, keywords) VALUES ($1, $2, $3, $4)',
        [s.name, s.specs, JSON.stringify(s.track_record), JSON.stringify(s.keywords)]
      );
    }
  }
}

export function isMemoryMode() {
  return useMemory;
}

export function getPool() {
  return pool;
}

export function getMemoryCategories() {
  return memoryCategories;
}

export function getMemoryRecords() {
  return memoryRecords;
}

export function addMemoryCategory(cat) {
  const now = new Date().toISOString();
  const newCat = { id: nextCatId++, ...cat, created_at: now, updated_at: now };
  memoryCategories.push(newCat);
  return newCat;
}

export function updateMemoryCategory(id, data) {
  const idx = memoryCategories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  memoryCategories[idx] = { ...memoryCategories[idx], ...data, updated_at: new Date().toISOString() };
  return memoryCategories[idx];
}

export function deleteMemoryCategory(id) {
  const idx = memoryCategories.findIndex(c => c.id === id);
  if (idx === -1) return false;
  memoryCategories.splice(idx, 1);
  return true;
}

export function addMemoryRecord(rec) {
  const now = new Date().toISOString();
  const newRec = { id: nextRecId++, created_at: now, shared_at: null, ...rec };
  const cat = memoryCategories.find(c => c.id === rec.matched_category_id);
  newRec.matched_category_name = cat ? cat.name : null;
  memoryRecords.unshift(newRec);
  return newRec;
}
