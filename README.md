# Family Care Cloud 프론트엔드

가족이 돌봄 기록과 일정을 함께 관리하는 웹사이트입니다. React · TypeScript · Vite로 만들며 실제 백엔드에 연결됩니다.

## 실행

Node.js 22 이상을 설치한 뒤 실행하세요.

```sh
npm ci
npm run dev
```

터미널에 표시된 주소를 엽니다. 로컬 개발 서버는 Vite 프록시로 AWS 백엔드에 연결합니다. 회원가입에는 이메일 인증이 필요하며, 입력한 기록과 일정은 실제 서버에 저장됩니다. 테스트할 때는 별도 그룹을 사용하세요.

다른 백엔드를 사용하려면 .env.example을 참고해 .env.local의 VITE_DEV_PROXY_TARGET을 설정하세요.

## 배포

- 사이트: https://develop.db2l4u9y804jp.amplifyapp.com
- develop 브랜치 변경 시 AWS Amplify가 자동 배포합니다.
- amplify.yml에서 설치·검사·빌드 및 공개 API 주소를 설정합니다. VITE_API_BASE_URL 환경변수로 주소를 변경할 수 있습니다.
- 데모 모드는 제거되었습니다. AWS 비밀키나 비밀번호를 VITE_ 환경변수에 넣지 마세요.

## 확인된 기능

로그인·재로그인, 가족 그룹 생성, 돌봄 기록 등록·수정·삭제, 일정 등록·수정·완료·취소, 새로고침 후 저장 유지까지 실제 백엔드에서 확인했습니다. 삭제 일정 표시, 기록 최신순 정렬, 로그아웃 시 화면 초기화 문제를 수정했습니다.

가족 간 공유·권한과 AI 인수인계는 별도 검증이 남아 있습니다. 별도 AI 서버 연동 완료를 의미하지 않습니다.

```sh
npm run lint
npm run build
```

## 코드 위치

- src/api.ts: 백엔드 요청과 세션 관리
- src/RealApp.tsx: 로그인·그룹 선택·화면 구성
- src/Real*.tsx: 기능별 화면
- src/data.ts: 공통 자료형과 날짜 표시
