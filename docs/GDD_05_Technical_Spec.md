# GDD-05: Technical Specifications

## Project Title: HISTORY OF SOVEREIGNS

### 5.1 기술 스택

- **Frontend:** Next.js 14+, CSS Modules
- **Backend:** Next.js API Routes, Firebase
- **Database:** Google Cloud Firestore
- **AI:** **Gemini 2.5 Flash-Lite** (`@google/generative-ai`)

### 5.2 아키텍처 개요

- **프론트엔드:** Next.js App Router, CSR 우선 + 서버 액션으로 민감 로직 제한. 서비스 워커로 웹 푸시.
- **백엔드:** Next.js API Routes(액션/전쟁/관리자), Firebase Admin SDK로 DB/인증/푸시(FCM) 호출.
- **서버 권한:** 전 국가 액션은 서버에서 계산 후 저장. 클라 계산 금지.
- **분산 잠금:** 국가 단위 Firestore 분산락 컬렉션(`locks/{nationId}`)으로 중복 액션 방지.
- **로그 파이프라인:** `logs/actions/{nationId}`, `logs/wars/{warId}`에 append-only 저장. BigQuery로 주기적 export.

### 5.3 데이터베이스 구조 (Firestore)

#### `global/admin` (관리자 설정)

```typescript
interface AdminConfig {
  allowed_uids: string[]; // 관리자 UID 목록
  maintenance_mode: boolean; // 점검 모드 여부
  global_notice: string; // 전체 공지 사항
}
```

#### nations/{uid}

```typescript
interface Nation {
  uid: string;

  identity: {
    name: string; // 유저 입력값 그대로 저장
    ruler_title: string;
    description: string;
    flag_color: string;
  };

  stats: {
    stability;
    economy;
    military;
    happiness;
    technology;
    sustainability;
    influence;
  };
  resources: { gold; food; materials; energy; population; territory };
  attributes: { climate; politics; economy_type };

  status: { last_action_at; shield_until; is_online; is_poverty };
  tags: string[];
}
```

#### `wars/{warId}`

```typescript
interface War {
  warId: string;
  attacker: string; // uid
  defender: string; // uid
  started_at: number;
  finished_at?: number;
  justification: string; // 명분
  result?: "attacker_win" | "defender_win" | "draw";
  logs: WarLog[];
  loot?: { gold; food; materials; energy; tiles: string[] };
}
```

#### `pending_events/{uid}`

```typescript
interface PendingEvent {
  type: "attack" | "trade" | "news" | "admin";
  payload: any;
  created_at: number;
}
```

### 5.4 주요 API 엔드포인트(예시)

- `POST /api/nation/create` : 건국. 입력 검증→Gemini 호출→스토리지/DB 저장.
- `POST /api/action` : 내정/외교/전쟁/정책 공통. 분산락→룰 검증→AI 보고서→트랜잭션 반영→로그 작성.
- `POST /api/admin/broadcast` : 전역 공지/뉴스 송출.
- `POST /api/admin/modify` : 특정 국가 스탯/자원 수정, Ban 처리.
- `GET /api/map` : 타일 정보, 국가 소유 현황, 뉴스 티커.
- `GET /api/user` : 내 국가 상태, pending_events, 보호막 상태.

### 5.5 보안 / 악용 방지

- Firestore 보안 규칙: 국가 문서는 본인 uid만 read/write, 관리자 컬렉션은 관리자 UID만.
- 요청 서명: 민감 액션은 Firebase ID Token + 서버 측 timestamp/nonce 검증.
- 스팸 방지: 액션 쿨타임, 동일 행동 점감 효율, 관리자가 실시간 로그로 모니터.
- 금지어 필터: 건국/뉴스 입력 시 금지어/개인정보 필터링(서버 측).

### 5.6 성능 / 확장성

- **Map 데이터:** 타일 정보는 CDN 캐시(JSON chunk). 국가 소유 변화만 실시간 fetch.
- **로그:** append-only로 쓰고, 읽기는 pagination. BigQuery Export 스케줄러로 장기 보관.
- **AI 호출:** 액션/보고서만 AI. 단문 요약을 워커 큐로 처리해 피크 시간 안정화.
- **쿨타임:** 서버 타임 기반. 클라는 상대 타임스탬프만 표시.

### 5.7 운영/관측

- **모니터링:** Firebase Crashlytics(클라), Cloud Logging(서버), APM 샘플링(요청 시간/실패율).
- **알림:** 웹 푸시(전쟁/멸망/공지), 이메일(패배 보고서/월간 리포트).
- **KPI 수집:** D1/D7/D30, 세션 길이, 전쟁 선언 수, 멸망률, 보호막 사용률.

### 5.8 AI 프롬프트/가드레일

- **프롬프트:** 문화 태그/정체성/현재 세계 상황/전술/지형을 포함한 콘텍스트로 요청. 출력은 120~200자 보고서, 금칙어 제거.
- **일관성:** 동일 국가에 일관된 톤을 유지하도록 시스템 메모리에 국가 인격 요약을 유지.
- **안전:** 입력 정화 후 AI 호출, 응답 검증(금칙어/개인정보/정치 민감도) 필터 후 저장.

### 5.9 테스트 전략

- **유닛:** 액션 룰 검증, 스탯 계산, 약탈 상한/보호막 로직.
- **통합:** `POST /api/action`→트랜잭션→로그→알림까지 end-to-end.
- **리플레이 테스트:** 기록된 전쟁 로그를 재계산하여 결정적 결과 보장.
- **로드:** 봇을 통해 1만 액션/일 시뮬레이션, 쿨타임/락 충돌 검증.
