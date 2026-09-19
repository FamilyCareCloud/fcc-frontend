# FCC 프론트엔드

사용자가 제공한 참고 이미지의 밝은 파란색, 왼쪽 메뉴, 상단 프로필, 카드 배치를 적용한 화면입니다. React + Vite + TypeScript + CSS를 사용합니다. 위치와 흐름은 UX 검토 후 바꿀 수 있습니다.

## 실행

실행할 컴퓨터에 Git과 Node.js가 설치되어 있어야 합니다. Node.js 22.19.0 / npm 10.9.3에서 확인했습니다. Node.js를 설치하면 npm도 함께 설치됩니다.

### 저장소를 처음 받는 경우

코드를 보관할 폴더에서 터미널을 열고 순서대로 실행하세요. 프로토타입이 있는 `develop` 브랜치를 받습니다.

```sh
git clone --branch develop https://github.com/FamilyCareCloud/fcc-frontend.git
cd fcc-frontend
npm ci
npm run dev
```

### 이미 저장소가 있는 경우

수정 중인 작업을 먼저 커밋하거나 별도로 보관한 뒤, `fcc-frontend` 저장소 폴더에서 실행하세요.

```sh
git fetch origin
git switch develop
git pull --ff-only origin develop
npm ci
npm run dev
```

`git switch`가 로컬 변경 때문에 중단되거나 `git pull --ff-only`가 실패하면, 강제로 덮어쓰지 말고 팀에 현재 상태를 공유하세요.

### 이후 다시 실행하는 경우

이미 패키지를 설치했다면 `fcc-frontend` 폴더에서 다음 명령만 실행하면 됩니다. 새 코드를 받은 뒤에는 `npm ci`를 다시 실행해 패키지 버전을 맞춰 주세요.

```sh
npm run dev
```

터미널에 표시된 로컬 주소(보통 `http://localhost:5173/`)를 브라우저에서 엽니다. 포트가 사용 중이면 주소가 달라질 수 있으니 터미널의 안내를 따르세요. 개발 서버가 켜져 있을 때만 접속할 수 있으며, 종료하려면 해당 터미널에서 `Ctrl+C`를 누릅니다.

백엔드([fcc-backend](https://github.com/FamilyCareCloud/fcc-backend))에 연결해 동작합니다. 먼저 백엔드를 실행하세요(로컬 모드, 기본 포트 3000).

```sh
# fcc-backend 폴더에서
pnpm start
```

개발 서버는 `/api`로 보내는 요청을 백엔드(`http://127.0.0.1:3000`)로 프록시하므로 CORS 설정이 필요 없습니다. 백엔드 주소가 다르면 `.env.local`에 `VITE_DEV_PROXY_TARGET`을 지정합니다. 배포된 API를 직접 쓰려면 `VITE_API_BASE_URL`을 설정하며, 이때는 API 쪽 CORS 허용 Origin에 이 앱 주소를 추가해야 합니다. `VITE_API_BASE_URL`이 비어 있는 프로덕션 빌드는 "서비스 연결 준비 중" 화면만 표시합니다.

## 구현 범위

| 화면            | 연결된 백엔드 API                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| 로그인·가입     | `/auth/register`, `/auth/login`, `/auth/confirm`(Cognito 이메일 코드), `/auth/logout`                   |
| 온보딩          | `/groups` 생성·목록, `/invitations/accept`(초대 코드 참여). 소속 그룹이 없으면 첫 화면으로 표시           |
| 대시보드        | 그룹·기록·일정 요약, 돌봄 도우미 질문(`/assistant`, 음성은 `/assistant/voice`)                            |
| 돌봄 기록       | `/events` 작성(유형 '자동 분류' 시 AI 분류)·수정(`version` 충돌 처리)·삭제. 작성자만 수정·삭제, 시스템 이력은 읽기 전용 |
| 일정            | `/schedules` 등록·수정·삭제·상태 변경, 담당 보호자 지정, 오늘·상태 필터                                     |
| AI 인수인계     | `/handoffs` 생성·재생성·이력·확인(`acknowledge`), 요약 항목별 근거 인용 표시                              |
| 가족 관리       | `/groups/{g}` 상세, 구성원, 고령자 등록·수정, 초대 코드 발급, 소유권 이전, 탈퇴, 다음 담당자 지정, 교대(`/handover`) |
| 상단 프로필     | `/me` 이름 수정, 로그아웃                                                                             |

세션(액세스 토큰)은 브라우저 localStorage(`fcc.session.v1`)에 저장되고, 만료되거나 서버가 401을 돌려주면 로그인 화면으로 돌아갑니다. 백엔드의 영문 코드(`hospital`, `scheduled` 등)와 화면의 한글 라벨 변환은 `src/data.ts`에 모여 있습니다.

아직 화면이 없는 API: 일정 취소·변경 승인 요청(`/approvals`), 초대 이메일 발송(백엔드가 코드만 발급), 목록 페이지네이션. 메뉴는 단일 화면의 상태 전환이며 URL별 라우팅은 사용하지 않습니다.

## 검증

```sh
npm run lint
node --experimental-strip-types --test data.test.mjs
npm run build
```

Vite 환경변수는 빌드 시 반영됩니다. 이전의 가상 데이터(시연) 모드와 `VITE_ENABLE_DEMO`는 제거되었습니다.

`node_modules/`, `dist/`, 실제 환경 파일은 Git에서 제외하고 `package-lock.json`은 관리합니다. 외부 웹폰트를 불러오지 못하면 시스템 한글 글꼴을 사용합니다.

## 코드 위치

- `src/api.ts`: fetch 래퍼(토큰 헤더·오류 정규화·401 처리)와 엔드포인트별 함수.
- `src/data.ts`: 화면 모델, 백엔드 응답 ↔ 화면 모델 변환, 날짜 처리(시간대 포함 ISO). `data.test.mjs`가 검증합니다.
- `src/Auth.tsx`, `src/Onboarding.tsx`: 로그인·가입과 첫 그룹 생성/참여. `src/App.tsx`가 세션·그룹 선택·데이터 로딩을 맡습니다.
