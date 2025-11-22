# GDD-07: Development Instruction Guide

## Project Title: HISTORY OF SOVEREIGNS

**타겟 모델:** **Gemini 2.5 Flash-Lite**
**핵심 규칙:** 1인 1국가, 리롤 없음, 관리자 시스템 구현.

---

### 🛠️ Phase 0: Context Injection

**[Prompt]**

> "docs/ 폴더의 모든 기획서를 정독해.
> 핵심 변경 사항: **유저가 직접 나라 이름을 짓고, 생성 후 리롤은 불가능하다.**
> 또한 **관리자 전용 대시보드**가 필요해."

---

### 🔑 Phase 1: Environment Setup

**[Prompt]**

> "Gemini 2.5 Flash-Lite API 키 발급법과 Firebase 설정을 알려줘.
> 추가로, **관리자 UID**를 관리하기 위해 `.env.local`에 `NEXT_PUBLIC_ADMIN_UIDS=["uid1", "uid2"]` 같은 형태로 설정할지, DB에 넣을지 추천해줘."

---

### 🏗️ Phase 2: Scaffolding & Types

**[Prompt]**

> "`types/nation.ts`에 확장된 7대 스탯과 4대 자원을 반영해.
> `identity.name`은 유저 입력값이므로 필수 필드야.
> 관리자 기능을 위해 `types/admin.ts`도 정의해줘."

---

### ⚙️ Phase 3: Firebase & Utils

**[Prompt]**

> "DB 로직(`lib/db.ts`)을 작성해.
>
> 1. `createNation`: 이미 국가가 존재하면 에러를 뱉어야 해 (1인 1국가).
> 2. **Firestore Rules:** 관리자만 모든 문서를 수정할 수 있고, 일반 유저는 자기 것만 수정하게 규칙을 짜줘."

---

### 🧠 Phase 4: The AI Engine

**[Prompt]**

> "국가 생성 API(`api/create`)와 행동 API(`api/action`)를 작성해.
>
> - **생성:** 유저가 입력한 `name`을 그대로 사용하고, AI에게는 작명 요청을 하지 마.
> - **모델:** `gemini-2.5-flash-lite` 사용.
> - **Server Authority:** 탭 닫힘 방지 로직 필수."

---

### 🎨 Phase 5: UI Implementation

**[Prompt]**

> "화면을 구현해.
>
> 1. **생성 페이지:** 8개 질문 폼과 '되돌릴 수 없음' 경고 모달.
> 2. **대시보드:** 모바일 우선 반응형 디자인.
> 3. **관리자 페이지 (`/admin`):** 내 UID가 관리자 목록에 있을 때만 접속 가능한 비밀 페이지를 만들어줘. 유저 리스트와 자원 수정 기능이 있어야 해."

---

### 🚀 Phase 6: Deployment

**[Prompt]**

> "Vercel 배포 절차와 환경 변수 설정법을 알려줘."
