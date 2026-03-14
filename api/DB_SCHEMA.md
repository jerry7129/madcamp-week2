# Database Schema Documentation

## 1. Users (`users`)
> 사용자 정보를 저장하는 테이블

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | **PK** | 사용자 고유 ID |
| `email` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | 이메일 주소 (로그인 ID) |
| `password` | `VARCHAR(255)` | | 암호화된 비밀번호 (Local 로그인 시 사용, OAuth는 null 가능) |
| `nickname` | `VARCHAR(50)` | `NOT NULL` | 사용자 닉네임 |
| `provider` | `VARCHAR(20)` | `DEFAULT 'local'` | 가입 경로 ('local', 'google' 등) |
| `provider_id` | `VARCHAR(255)` | | OAuth 제공자의 고유 사용자 ID |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | 가입 일시 |

---

## 2. Font Projects (`font_project`)
> UFO 3 포맷 기반의 폰트 프로젝트 메타데이터 저장

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `project_id` | `BIGSERIAL` | **PK** | 프로젝트 고유 ID |
| `title` | `VARCHAR(255)` | `NOT NULL` | 프로젝트 이름 |
| `owner_id` | `BIGINT` | `FK` -> `users(id)` | 프로젝트 생성자 (소유자) |
| `meta_info` | `JSONB` | | `metainfo.plist` 데이터 (버전 정보 등) |
| `font_info` | `JSONB` | | `fontinfo.plist` 데이터 (저작권, 수치값 등) |
| `groups` | `JSONB` | | `groups.plist` 데이터 (커닝 그룹 등) |
| `kerning` | `JSONB` | | `kerning.plist` 데이터 (커닝 값) |
| `features` | `TEXT` | | `features.fea` (OpenType 피처 코드) |
| `layer_config` | `JSONB` | | `layercontents.plist` (레이어 목록) |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | 생성 일시 |
| `updated_at` | `TIMESTAMP` | `DEFAULT NOW()` | 수정 일시 |

---

## 3. Project Collaborators (`project_collaborators`)
> 프로젝트 참여자와 권한 관리 (M:N)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | **PK** | 관계 고유 ID |
| `project_id` | `BIGINT` | `FK` -> `font_project(id)` | 대상 프로젝트 |
| `user_id` | `BIGINT` | `FK` -> `users(id)` | 참여 사용자 |
| `role` | `VARCHAR(20)` | `DEFAULT 'EDITOR'` | 권한 ('OWNER', 'EDITOR', 'VIEWER') |
| `joined_at` | `TIMESTAMP` | `DEFAULT NOW()` | 참여 일시 |

> **Unique Constraint**: `(project_id, user_id)` - 중복 참여 불가

---

## 4. Glyphs (`glyph`)
> 개별 글자(Glyph)의 벡터 데이터 및 속성 저장 (UFO 3 구조)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `glyph_uuid` | `UUID` | **PK** | 글리프 고유 식별자 (자동 생성) |
| `project_id` | `BIGINT` | `FK` -> `font_project` | 소속 프로젝트 |
| `layer_name` | `VARCHAR(50)` | `DEFAULT 'public.default'` | UFO 레이어 이름 |
| `glyph_name` | `VARCHAR(255)` | `NOT NULL` | 글자 이름 (예: 'A', '.notdef') |
| `format_version`| `INTEGER` | `DEFAULT 2` | UFO 글리프 포맷 버전 |
| `unicodes` | `VARCHAR(10)[]`| | 유니코드 목록 배열 (Array) |
| `advance_width` | `INTEGER` | `DEFAULT 0` | 글자 가로 폭 |
| `advance_height`| `INTEGER` | `DEFAULT 0` | 글자 세로 폭 |
| `outline_data` | `JSONB` | | **핵심 데이터**: 윤곽선, 포인트 정보 (UFO `<outline>` 태그 내용) |
| `properties` | `JSONB` | `DEFAULT '{}'` | 기타 속성 (Anchor, Guideline, Image 등) |
| `last_modified_by`| `VARCHAR(255)`| | 마지막 수정자 이메일/닉네임 |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 글리프 정렬 순서 |
| `updated_at` | `TIMESTAMP` | `DEFAULT NOW()` | 수정 일시 |

> **Unique Constraint**: `(project_id, layer_name, glyph_name)` - 프로젝트 내 레이어별로 글자 이름은 유일해야 함.
