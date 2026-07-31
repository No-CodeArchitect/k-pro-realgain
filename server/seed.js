import { getAll, runInsert } from './db.js';

const seedData = [
  {
    name: '방사선감시설비(RMS)',
    specs: 'Waste Liquid RMS, SGLM(N-16), Boron 농도감시(BCMS), Area/Process Radiation Monitoring System, Gaseous/Liquid Effluent Monitoring System, Main Steam Line Radiation Monitoring, Containment High Range Area Monitor',
    track_record: ['한빛 3·4·5·6호기', '한울 1~6호기', '고리 2·3·4호기', '월성 1~4호기', '새울 1·2호기'],
    keywords: ['RMS', '방사선감시', 'N-16', 'Liquid RMS', 'Boron', 'BCMS', 'SGLM', '방사선', '방사능', '방사선감시설비', '환경방사선', 'Area Monitor', 'Process Monitor', '배기감시', '배수감시', '주증기관', 'MSLRM']
  },
  {
    name: '내방사선 CCTV',
    specs: '세계 최초 내방사선 Color CCTV(격납건물·사용후연료저장조용), 고방사선 환경(10^7 Rad 이상) 내구성, Pan/Tilt/Zoom 원격제어, 격납건물 내부 감시, 사용후연료저장조(SFP) 수중 감시카메라',
    track_record: ['국내 다수 원전', '한빛 원전', '한울 원전', '고리 원전', '월성 원전'],
    keywords: ['CCTV', '카메라', '내방사선', '격납건물 감시', '사용후연료', 'SFP', '수중카메라', '방사선카메라', 'Color CCTV', '감시카메라', '원격감시']
  },
  {
    name: '전자카드 진단장비',
    specs: 'PIN POINT 전자카드 시험장비, 광격리카드(Fiber Optic Isolation Card), PCM(Power Control Module) 진단기, 제어시스템 전자카드 현장 진단 및 정비, 아날로그/디지털 카드 종합 시험',
    track_record: ['월성 1~4호기', '한빛 1~6호기', '한울 1~6호기', '고리 2~4호기', '새울 1·2호기'],
    keywords: ['전자카드', '카드 진단', 'PCM', '광격리카드', 'PIN POINT', '전자카드 시험', 'Fiber Optic', '제어카드', '계측카드']
  },
  {
    name: '제어봉 계통 진단장비',
    specs: 'CEDM 코일진단장비, CEDMCS Simulator, DRPI(Digital Rod Position Indication) 진단, ACTM(AC Timing Module) 센서, 제어봉구동장치(CEDM) 계통 종합진단, RPCS 성능시험장비',
    track_record: ['한빛 3~6호기', '한울 1~6호기', '월성 원전', '고리 원전'],
    keywords: ['제어봉', '코일진단', 'CEDMCS', 'DRPI', 'ACTM', 'CEDM', '제어봉구동', 'RPCS', '코일저항', '제어봉 계통']
  },
  {
    name: '정비용역',
    specs: '제어봉/PCS/ASTS/RMS 설비 정비, 계획예방정비, 비계획정비, 성능시험, 설비 건전성 평가, 원전 I&C(계측제어) 설비 전반 정비용역',
    track_record: ['국내 원전 전반', '한빛 원전', '한울 원전', '고리 원전', '월성 원전', '새울 원전'],
    keywords: ['정비', '정비용역', 'PCS', 'ASTS', '계획예방정비', '성능시험', '설비정비', 'I&C', '계측제어', '건전성평가']
  }
];

export default async function seed() {
  const existing = getAll('SELECT COUNT(*) as cnt FROM product_categories');
  const count = existing[0]?.cnt || 0;

  if (count === 0) {
    for (const item of seedData) {
      runInsert(
        `INSERT INTO product_categories (name, specs, track_record, keywords) VALUES (?, ?, ?, ?)`,
        [item.name, item.specs, JSON.stringify(item.track_record), JSON.stringify(item.keywords)]
      );
    }
    console.log(`시드 데이터 ${seedData.length}건 입력 완료`);
  } else {
    console.log(`이미 ${count}건의 제품군 데이터가 존재합니다.`);
  }
}
