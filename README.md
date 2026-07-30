<div align="center">
  <img src="docs/images/career-dungeon-icon.png" width="180" alt="Career Dungeon 아이콘" />
  <h1>Career Dungeon</h1>
  <p><strong>이력서에서 시작해 실전 답변력을 성장시키는 AI 면접관 성장 시뮬레이터</strong></p>
  <p>
    문서 기반 맞춤 질문과 꼬리질문에 답하고,<br/>
    평가 결과로 신뢰도 게이지를 채워 다음 면접관을 해금합니다.
  </p>
  <p><code>Frontend</code></p>
</div>

<br/>

## 목차

1. [팀 소개](#팀-소개)
2. [개발 배경](#개발-배경)
3. [사용자 흐름](#사용자-흐름)
4. [주요 화면과 기능](#주요-화면과-기능)
5. [기술 스택](#기술-스택)
6. [로컬 실행](#로컬-실행)
7. [환경 변수](#환경-변수)
8. [스크립트와 검증](#스크립트와-검증)
9. [프로젝트 구조](#프로젝트-구조)

<br/>

## 팀 소개

<table align="center">
  <tr>
    <td align="center"><a href="https://github.com/Lee1sd"><img src="https://github.com/Lee1sd.png?size=160" width="120" alt="이건희 GitHub 프로필"/></a></td>
    <td align="center"><a href="https://github.com/lei-3m"><img src="https://github.com/lei-3m.png?size=160" width="120" alt="김한비 GitHub 프로필"/></a></td>
    <td align="center"><a href="https://github.com/yongseong123"><img src="https://github.com/yongseong123.png?size=160" width="120" alt="최용성 GitHub 프로필"/></a></td>
    <td align="center"><a href="https://github.com/JIMIN-1211"><img src="https://github.com/JIMIN-1211.png?size=160" width="120" alt="표지민 GitHub 프로필"/></a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/Lee1sd"><strong>이건희</strong></a></td>
    <td align="center"><a href="https://github.com/lei-3m"><strong>김한비</strong></a></td>
    <td align="center"><a href="https://github.com/yongseong123"><strong>최용성</strong></a></td>
    <td align="center"><a href="https://github.com/JIMIN-1211"><strong>표지민</strong></a></td>
  </tr>
  <tr>
    <td align="center">파일파이프라인</td>
    <td align="center">면접 엔진 + LLM</td>
    <td align="center">평가 · 게이지 · 해금</td>
    <td align="center">인증 + 인프라 + FE</td>
  </tr>
</table>

<br/>

## 개발 배경

Career Dungeon은 범용 질문을 한 번 풀고 끝나는 모의면접에서 벗어나, 사용자의 실제
이력서와 포트폴리오를 바탕으로 반복해서 답변을 다듬을 수 있도록 만든 게임형 면접
연습 서비스입니다.

- 업로드한 문서에 기반한 개인화 질문
- 직전 답변의 약점을 파고드는 꼬리질문
- 성향과 난이도가 다른 AI 면접관
- 점수, 신뢰도 게이지, 뱃지와 레벨 해금으로 이어지는 성장 경험
- 데스크톱과 모바일 브라우저를 고려한 반응형 UI

백엔드 저장소:
[Lee1sd/INT2_Team3_Vibe_BE](https://github.com/Lee1sd/INT2_Team3_Vibe_BE)

<br/>

## 사용자 흐름

1. Google 계정으로 로그인합니다.
2. 마이페이지에서 이력서 또는 포트폴리오를 업로드합니다.
3. 현재 해금된 AI 면접관과 연습할 기술 주제를 선택합니다.
4. 이력서 기반 질문에 답하고, 이어지는 꼬리질문에 답합니다.
5. 문항별 결과, 종합 점수와 피드백을 확인합니다.
6. 기준을 충족하면 다음 면접관과 뱃지가 해금됩니다.
7. 마이페이지에서 진행도와 면접 히스토리를 다시 확인합니다.

<br/>

## 주요 화면과 기능

<details>
<summary><strong>로그인</strong></summary>

<br/>

- Google OAuth2 로그인 진입
- 인증 콜백 처리
- 보호된 화면 접근과 세션 만료 안내
- 로그인 전 접근하려던 경로 복귀

</details>

<details>
<summary><strong>이력서·포트폴리오</strong></summary>

<br/>

- PDF, TXT, MD 파일 선택과 클라이언트 검증
- 업로드 진행·완료·실패 상태 표시
- 등록된 문서 목록과 면접에 사용할 문서 선택
- Mock과 실제 Presigned Upload API 전환 지원

</details>

<details>
<summary><strong>면접관 선택과 면접</strong></summary>

<br/>

- 면접관별 레벨, 성향, 잠금·해금 상태 표시
- 기술 주제 선택과 면접 시작 전 조건 확인
- 질문·답변·꼬리질문으로 이어지는 채팅 UI
- 제출 중 로딩, 오류 복구, 중복 제출 방어

</details>

<details>
<summary><strong>결과와 마이페이지</strong></summary>

<br/>

- 문항별 점수와 종합 피드백
- 최종 점수와 신뢰도 게이지 시각화
- 획득 뱃지와 전체 뱃지 도감
- 레벨별 면접 히스토리와 상세 결과 조회
- 사용자 프로필 조회·수정

</details>

<br/>

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Core | React 19, TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4, clsx, tailwind-merge |
| Routing | React Router 7 |
| UI | Motion, Lucide React |
| API | Fetch 기반 REST Client, 도메인별 API·Mock 전환 |
| Test | Node.js Test Runner, tsx, TypeScript type check |
| Infra | GitHub Actions, AWS EC2, Nginx |

<br/>

## 로컬 실행

### 사전 요구사항

- Node.js 20 이상
- npm

### 1. 의존성 설치

```bash
npm ci
```

### 2. 환경 변수 준비

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux**

```bash
cp .env.example .env
```

### 3. 개발 서버 실행

```bash
npm run dev
```

기본 개발 서버 주소는 `http://localhost:3000`입니다.

<br/>

## 환경 변수

| 변수 | 기본 예시 | 설명 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | 백엔드 API 서버 주소 |
| `VITE_USE_MOCK` | `true` | `true`면 도메인 Mock, `false`면 실제 API 사용 |

백엔드 연동 전에는 `VITE_USE_MOCK=true`로 독립 실행할 수 있습니다. 실제 API와 연결할 때는
`VITE_USE_MOCK=false`로 변경하고 `VITE_API_BASE_URL`을 실행 중인 백엔드 주소에 맞춥니다.

<br/>

## 스크립트와 검증

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run lint` | TypeScript 타입 검사 |
| `npm test` | 도메인 로직 테스트 실행 |
| `npm run build` | 운영용 번들 생성 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |

전체 검증은 다음 순서로 실행합니다.

```bash
npm run lint
npm test
npm run build
```

`main` 브랜치 배포 워크플로는 Node.js 20에서 빌드한 `dist/`를 AWS EC2의 Nginx 서빙
경로에 배포합니다.

<br/>

## 프로젝트 구조

```text
.
├── public/
│   ├── brand/                   # 서비스 아이콘과 브랜드 자산
│   └── interviewers/            # 면접관, 포즈, 배경 이미지
├── src/
│   ├── api/                     # 공통 REST Client
│   ├── components/              # 인증, 뱃지, 히스토리 등 공통 UI
│   ├── domains/
│   │   ├── auth/                # 인증 API·서비스·Mock
│   │   ├── interview/           # 면접 진행과 결과
│   │   ├── progress/            # 진행도와 뱃지
│   │   └── resume/              # 문서 업로드와 선택
│   ├── pages/                   # 로그인, 업로드, 면접, 결과, 마이페이지
│   ├── App.tsx                  # 라우팅과 앱 셸
│   └── main.tsx                 # 애플리케이션 진입점
├── .env.example
├── package.json
├── vite.config.ts
└── tsconfig.json
```

<br/>

---

<div align="center">
  <em>Career Dungeon — Team 3</em>
</div>
