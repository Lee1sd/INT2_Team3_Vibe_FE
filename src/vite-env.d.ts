/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 서버 주소. 로컬 개발 기본값은 http://localhost:8080 (Spring Boot 기본 포트). */
  readonly VITE_API_BASE_URL: string;
  /**
   * 'false'로 설정하면 각 도메인의 실제 API 구현(*.api.ts)을 사용한다.
   * 백엔드 엔드포인트가 아직 준비되지 않았다면 반드시 비워두거나 'true'로 둔다(mock 사용).
   * 비워둘 수 있으므로(=mock 사용) 옵셔널로 선언한다.
   */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
