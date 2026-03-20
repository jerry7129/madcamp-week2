# Fontogether API Documentation

## 🌐 Base Config
**Development (Localhost)**:
- REST URL: `http://localhost:80`
- WebSocket URL: `ws://localhost:80/ws`

**Production (K-Cloud VM)**:
- REST URL: `http://172.10.5.122.nip.io`
- WebSocket URL: `ws://172.10.5.122.nip.io/ws`
- **Socket Client**: SockJS supported

## 📚 Interactive Documentation (Swagger)
For testing and interactive documentation, please visit **Swagger UI**:

loclahost
- [http://localhost/swagger-ui/index.html](http://localhost/swagger-ui/index.html)

K-Cloud VM
- [http://172.10.5.122.nip.io/swagger-ui/index.html](http://172.10.5.122.nip.io/swagger-ui/index.html)

---

## 👤 User API
> 사용자 관리 및 인증

### 1. 회원가입
- **URL**: `POST /api/users/signup`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "nickname": "Designer"
  }
  ```
- **Response**: `200 OK` (User ID: `Long`)

### 2. 로그인
- **URL**: `POST /api/users/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: `200 OK` (User Object)
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "nickname": "Designer",
    "provider": "local",
    "createdAt": "..."
  }
  ```

### 3. 사용자 상세 조회
- **URL**: `GET /api/users/{userId}`
- **Response**: `200 OK`
  ```json
  {
      "id": 1,
      "email": "user@example.com",
      "nickname": "Updated Nickname"
  }
  ```

### 4. 사용자 정보 수정
- **URL**: `PUT /api/users/{userId}`
- **Request Body**:
  ```json
  {
      "nickname": "New Nickname"
  }
  ```
- **Response**: `200 OK`

### 5. 비밀번호 변경
- **URL**: `POST /api/users/{userId}/password`
- **Request Body**:
  ```json
  {
      "oldPassword": "currentPassword",
      "newPassword": "newPassword123"
  }
  ```
- **Response**: `200 OK`

### 6. 회원 탈퇴
- **URL**: `DELETE /api/users/{userId}`
- **Response**: `200 OK`

### 6. 사용자 프로젝트 목록 조회
- **URL**: `GET /api/projects/user/{userId}`
- **Response**: `200 OK` (List of Projects)
  ```json
  [
    {
      "projectId": 1,
      "title": "My First Font",
      "ownerId": 1,
      "role": "OWNER",
      "isShared": false,
      "createdAt": "..."
    },
    {
      "projectId": 2,
      "title": "Shared Project",
      "ownerId": 5,
      "role": "EDITOR",
      "isShared": true,
      "createdAt": "..."
    }
  ]
  ```

### 4. 구글 로그인 (SPA Flow / Manual Exchange)
> 프론트엔드에서 인증 코드를 받아 백엔드로 전달하는 방식입니다.

#### 1) 흐름
1. **Client**: 구글 로그인 창을 띄우고 사용자 동의를 받는다.
2. **Client**: 구글에서 `Authorization Code`를 받는다.
3. **Client**: 백엔드 API (`POST /api/auth/google`)로 코드를 보낸다.
4. **Server**: 코드를 토큰으로 교환하고, 사용자 정보를 확인한다.
5. **Server**: 세션(`JSESSIONID`)을 생성하고 응답한다.

#### 2) 로그인 API (Code 전달)
- **URL**: `POST /api/auth/google`
- **Request Body**:
  ```json
  {
    "code": "4/0AeaYSH..." 
  }
  ```
- **Response**: `200 OK`
  ```json
  {
      "message": "Login successful",
      "user": {
          "id": 1,
          "email": "user@gmail.com",
          "nickname": "Google User",
          "provider": "google",
          ...
      },
      "sessionId": "..."
  }
  ```
- **Cookie**: 응답 헤더에 `Set-Cookie: JSESSIONID=...`가 포함됩니다. 브라우저가 자동으로 저장합니다.

---

## ✒️ Glyph API (REST)
> 글리프 데이터 CRUD 및 동기화

### 1. 글리프 단건 조회
- **URL**: `GET /api/projects/{projectId}/glyphs/{glyphName}`
- **Path Variables**:
  - `projectId`: 프로젝트 ID
  - `glyphName`: 글자 이름 (예: `A` or `.notdef`)
- **Response**: `200 OK`
  ```json
  {
    "glyphUuid": "...",
    "projectId": 1,
    "glyphName": "A",
    "unicodes": ["0041"],
    "advanceWidth": 600,
    "outlineData": "{\"contours\": [...]}",
    "properties": "{...}"
  }
  ```
  *(데이터가 없으면 비어있는 기본 UFO .glif 구조 반환)*

### 2. 프로젝트 전체 글리프 조회
- **URL**: `GET /api/projects/{projectId}/glyphs`
- **Response**: `200 OK` (List of Glyphs)

### 3. 글리프 저장 (REST)
> **Note**: 실시간 협업 시에는 WebSocket 권장. 이 API는 대량 업로드/백업용.
- **URL**: `POST /api/projects/{projectId}/glyphs`
- **Request Body**:
  ```json
  {
    "projectId": 1,
    "glyphName": "A",
    "unicodes": ["0041"],
    "outlineData": "...", 
    "advanceWidth": 600
  }
  ```

### 4. 접속자 수 조회 (Session Count)
- **URL**: `GET /api/projects/{projectId}/glyphs/collaborators/count`
- **Response**: `Number` (현재 접속 중인 세션 수. 탭 단위)

### 5. 프로젝트 Export (UFO Download)
- **URL**: `GET /api/projects/{projectId}/export`
- **Response**: `200 OK` (ZIP File Download)
  - `Content-Type`: `application/octet-stream`
  - `Content-Disposition`: `attachment; filename=project_{id}.zip`

---

## 📁 Project Management API
> 프로젝트 생성, 수정, 삭제

### 1. 템플릿으로 프로젝트 생성
- **URL**: `POST /api/projects/template`
- **Request Body**:
  ```json
  {
      "ownerId": 1,
      "templateName": "Basic",
      "title": "My Project Title" 
  }
  ```
  *(templateName: "Empty", "Basic", "Korean", or "English")*
  *(title: Optional. If omitted, default name used)*
- **Response**: `200 OK` (ProjectId: `Long`)

### 2. UFO 파일로 프로젝트 생성 (Import)
- **URL**: `POST /api/projects/ufo`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: UFO 폴더를 압축한 ZIP 파일 (`.zip`)
  - `userId`: 소유자 ID (`Long`)
  - `title`: 프로젝트 제목 (Optional. `fontinfo`보다 우선 적용)
- **Response**: `200 OK` (ProjectId: `Long`)

### 3. 프로젝트 메타데이터 수정
- **URL**: `PUT /api/projects/{projectId}`
- **Request Body**:
  ```json
  {
      "userId": 1,
      "title": "New Title"
  }
  ```
- **Response**: `200 OK`

### 3. 프로젝트 삭제
- **URL**: `DELETE /api/projects/{projectId}?userId={userId}`
- **Response**: `200 OK`

---

## 🤝 Collaboration API
> 협업자 초대 및 관리

### 1. 협업자 목록 조회
- **URL**: `GET /api/projects/{projectId}/collaborators`
- **Response**: `200 OK`
  ```json
  [
      {
          "userId": 2,
          "nickname": "Partner",
          "email": "partner@example.com",
          "role": "EDITOR", 
          "joinedAt": "..."
      }
  ]
  ```

### 2. 협업자 초대 (추가)
- **URL**: `POST /api/projects/{projectId}/collaborators`
- **Request Body**:
  ```json
  {
      "requesterId": 1,
      "email": "friend@example.com",
      "role": "EDITOR"
  }
  ```
- **Response**: `200 OK`

### 3. 협업자 권한 수정
- **URL**: `PUT /api/projects/{projectId}/collaborators/{targetUserId}`
- **Request Body**:
  ```json
  {
      "requesterId": 1,
      "role": "VIEWER"
  }
  ```
- **Response**: `200 OK`

### 4. 협업자 내보내기 (강퇴)
- **URL**: `DELETE /api/projects/{projectId}/collaborators/{targetUserId}?requesterId={requesterId}`
- **Response**: `200 OK`
- **Side Effect**: 해당 사용자가 접속 중이면 WebSocket으로 강퇴 알림 전송됨.

---

## ⚡ WebSocket API (Real-time)
> 실시간 협업 프로토콜 (STOMP)

### Connection
- **Endpoint**: `/ws`
- **Topic Prefix** (Server -> Client): `/topic`
- **App Prefix** (Client -> Server): `/app`

### 1. Glyph Update (글자 수정)
- **Send To**: `/app/glyph/update`
- **Subscribe**: `/topic/project/{projectId}/glyph/update`
- **Payload**:
  ```json
  {
    "projectId": 1,
    "glyphName": "A",
    "unicodes": [65],  // Optional. List of decimal unicodes.
    "outlineData": "{\"contours\": ...}",
    "advanceWidth": 600,
    "userId": 1,
    "nickname": "Designer"
  }
  ```

### 2. Glyph Management (관리)
- **Send To**: `/app/glyph/action`
- **Subscribe**: `/topic/project/{projectId}/glyph/action`
- **Payload**:
  ```json
  {
    "projectId": 1,
    "action": "RENAME", // ADD, DELETE, REORDER, MOVE
    "glyphName": "Target",
    "newName": "NewName", // RENAME
    "newOrder": ["A", "B"], // REORDER
    "toIndex": 5 // MOVE
  }
  ```

### 3. User Presence (접속 상태)
- **Subscribe**: `/topic/project/{projectId}/presence`

#### A. 입장 (Join)
- **Send To**: `/app/project/join`
- **Payload**: `{ "userId": 1, "nickname": "...", "projectId": 1 }`

#### B. 퇴장 (Leave)
- **Send To**: `/app/project/leave`
- **Payload**: `{ "userId": 1, "nickname": "...", "projectId": 1 }`

#### C. 편집 시작 (Focus)
- **Send To**: `/app/glyph/start-editing`
- **Payload**: 
  ```json
  { 
    "userId": 1, 
    "projectId": 1, 
    "editingUnicode": "0041" 
  }
  ```
  *(다른 사용자에게 "누가 이 글자를 고치고 있음"을 알림)*

#### E. 강퇴 알림 (Kick)
- **Subscribe**: `/topic/project/{projectId}/kick`
- **Payload**: `{ "kickedUserId": 1 }`
- **Action**: 클라이언트는 이 메시지를 받으면 자신이 강퇴된 것인지 확인하고 메인 화면으로 이동해야 함.

#### F. 프로젝트 상세 정보 업데이트 (MetaInfo, Kerning 등)
- **Subscribe**: `/topic/project/{projectId}/update/details`
- **Send To**: `/app/project/update/details`
- **Payload**:
  ```json
  {
      "projectId": 1,
      "userId": 1,
      "updateType": "KERNING", 
      "data": "{\"pairs\": {...}}" 
  }
  ```
- **UpdateType 종류**: `META_INFO`, `FONT_INFO`, `GROUPS`, `KERNING`, `FEATURES`, `LAYER_CONFIG`, `LIB`
- **Data**: 각 항목에 맞는 JSON 문자열
  - **FEATURES 예시**:
    ```json
    {
      "languagesystems": [...],
      "classes": [...],
      "lookups": [...],
      "tables": [...],
      "features": [...],
      "prefix": "..."
    }
    ```
