# Fontogether API

Font 에디터를 웹에서 실시간으로 협업할 수 있게 하는 백엔드 API 서버입니다.

## 기술 스택

- **Java**: JDK 21
- **Framework**: Spring Boot 3.5.10-SNAPSHOT
- **Database**: PostgreSQL 16
- **실시간 통신**: WebSocket (STOMP)
- **빌드 도구**: Gradle

## 주요 기능

### 1. 실시간 협업
- WebSocket을 통한 실시간 글리프(Glyph) 동기화
- 사용자 접속/해제 상태 추적
- 특정 글리프 편집 중인 사용자 표시

### 2. REST API
- 글리프 CRUD 작업
- 프로젝트별 글리프 목록 조회
- 협업자 수 조회

## 1. Authentication (인증/인가)

### 1) 가입 및 로그인
- **회원가입**: `POST /api/users/signup`
- **로그인**: `POST /api/users/login` (세션 기반)
- **구글 로그인**: `POST /api/auth/google` (Authorization Code 방식)

### 2) 사용자 관리
- **상세 조회**: `GET /api/users/{userId}`
- **정보 수정**: `PUT /api/users/{userId}`
- **비밀번호 변경**: `POST /api/users/{id}/password`
- **탈퇴**: `DELETE /api/users/{id}`
- **프로젝트 목록**: `GET /api/projects/user/{userId}`

---

## 2. Project Management (프로젝트 관리)

### 1) 프로젝트 생성
- **템플릿 생성**: `POST /api/projects/template`
  ```json
  {
      "ownerId": 1,
      "templateName": "Basic", // "Empty", "Basic", "Korean", "English"
      "title": "My Title"
  }
  ```
- **UFO Import**: `POST /api/projects/ufo` (Multipart File .zip)

### 2) 관리 기능
- **메타데이터 수정**: `PUT /api/projects/{projectId}`
- **삭제**: `DELETE /api/projects/{projectId}`
- **Export (UFO 다운로드)**: `GET /api/projects/{projectId}/export`

---

## 3. Glyph API (REST & Real-time)

### REST 엔드포인트
> 대량 데이터 조회 및 초기 로딩용
- **단건 조회**: `GET /api/projects/{projectId}/glyphs/{glyphName}`
- **전체 조회**: `GET /api/projects/{projectId}/glyphs`
- **저장(POST)**: `POST /api/projects/{projectId}/glyphs`

### WebSocket (STOMP) 프로토콜
- **Endpoint**: `/ws`
- **Prefix**: `/app` (Client->Server), `/topic` (Server->Client)

#### 주요 토픽 (Subscribe)
1. **글리프 업데이트**: `/topic/project/{id}/glyph/update`
2. **사용자 상태**: `/topic/project/{id}/presence`
3. **강퇴 알림**: `/topic/project/{id}/kick`
4. **상세 정보**: `/topic/project/{id}/update/details` (커닝, 피처 등)

#### 주요 액션 (Send)
1. **편집(Update)**: `/app/glyph/update`
   ```json
   {
       "projectId": 1,
       "glyphName": "A",
       "unicodes": [65],
       "outlineData": "...",
       "userId": 1,
       "nickname": "User"
   }
   ```
2. **관리(Action)**: `/app/glyph/action`
   - **RENAME**: 이름 변경
   - **ADD/DELETE**: 추가/삭제
   - **REORDER**: 순서 변경
   - **MOVE**: 인덱스 이동

---

## 4. Database Schema (PostgreSQL)

### `users`
사용자 계정 및 인증 정보
- `email`, `password`, `nickname`, `provider` (local/google)

### `font_project`
프로젝트 메타데이터 (UFO 3.0 기반)
- `meta_info`, `font_info`, `groups`, `kerning`, `features` (fea code)

### `project_collaborators`
프로젝트 멤버 및 권한 관리 (M:N)
- `role`: OWNER, EDITOR, VIEWER

### `glyph`
개별 글자 벡터 데이터
- `glyph_name` (PK part), `outline_data` (contours), `unicodes`, `advance_width`
- `sort_order`: 글자 순서

---

## 실행 방법

### 1. 데이터베이스 실행
```bash
docker-compose up -d
```

### 2. 애플리케이션 실행
```bash
./gradlew bootRun
```
또는
```bash
java -jar build/libs/api-0.0.1-SNAPSHOT.jar
```

### 3. API 문서 (Swagger UI)
- **Local**: [http://localhost:80/swagger-ui/index.html](http://localhost:80/swagger-ui/index.html)
- **VM**: [http://172.10.5.122.nip.io/swagger-ui/index.html](http://172.10.5.122.nip.io/swagger-ui/index.html)

## 개발 환경 설정

### 환경 변수 (.env)
프로젝트 루트에 `.env` 파일을 생성하고 다음 값을 채워주세요:

```properties
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydb
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CORS_ALLOWED_ORIGINS=http://172.10.5.122.nip.io # Optional (Default: *)
```


## 라이선스
이 프로젝트는 교육 목적으로 개발되었습니다.
