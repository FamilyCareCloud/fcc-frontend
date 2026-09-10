# 프론트 배포

- 웹사이트: https://develop.db2l4u9y804jp.amplifyapp.com
- AWS 리전: 서울 (`ap-northeast-2`)
- Amplify 앱: `fcc-frontend` (`db2l4u9y804jp`)
- 연결 브랜치: `develop`. 이 브랜치에 푸시하면 자동 빌드·배포됩니다.
- 저장소 루트의 `amplify.yml`로 의존성 설치, 빌드, `dist` 배포를 정의합니다.
- Amplify 환경 변수: `VITE_ENABLE_DEMO=true`. 첫 배포는 가상 가족을 사용하는 시연 화면입니다.

백엔드 API 주소는 https://uwv0zhujxf.execute-api.ap-northeast-2.amazonaws.com 입니다. 상태 확인 경로는 `/health`입니다.

현재 화면은 실제 백엔드 API에 연결되지 않았습니다. 기록은 브라우저에 저장되며 로그인·그룹·일정 등 실제 API 연동은 후속 작업입니다. `VITE_API_BASE_URL`을 설정하는 것만으로 연결되지 않습니다. AI 서버는 이번 배포에 포함되지 않았습니다.

실제 API 연동 후에는 시연 모드를 해제하고 회원가입·로그인·기록 저장 및 재조회 흐름을 확인해야 합니다. AWS 비밀 키나 AI 키를 Vite 환경 변수에 넣지 않습니다.

2026-09-10 검증: Amplify 배포 성공, HTTPS 200, 브라우저 대시보드·기록 화면 탐색 정상.
