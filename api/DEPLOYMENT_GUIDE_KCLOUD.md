# K-Cloud VM 배포 가이드

## 1. 아키텍처 개요
- **Spring Boot (API)**: Docker Container (Port 80)
- **PostgreSQL (DB)**: Docker Container (Internal Network)
- **접속 방식**: 외부 클라이언트는 K-Cloud 방화벽(Port 80)을 통해 API에 접근.

## 2. 배포 사전 준비
로컬에서 VM으로 파일을 전송해야 합니다. (Git Clone을 해도 되지만, `.env` 등 보안 파일은 직접 전송 필요)

### ✅ 필수 전송 파일 리스트 (이것만 옮기세요)
| 경로/파일명 | 설명 | 비고 |
| :--- | :--- | :--- |
| `src/` | 소스 코드 폴더 전체 | |
### 1. 전송할 파일 목록 (내 컴퓨터 -> 서버)

서버의 `/home/server` 폴더 아래에 `api`와 `frontend` 폴더를 구성합니다.

#### `/home/server/api/` (백엔드)
| 파일/폴더 | 설명 | 비고 |
| :--- | :--- | :--- |
| `src/` | 자바 소스 코드 | |
| `gradle/` | Gradle Wrapper 폴더 | |
| `nginx/` | **[New]** Nginx 설정 폴더 (`nginx.conf` 포함) | 필수 |
| `docker-compose.yml` | 도커 실행 설정 (Nginx 포함됨) | 수정됨 |
| `Dockerfile` | Spring Boot 이미지 빌드 설정 | |
| `.env` | 환경 변수 파일 | **보안 주의** (`CORS_ALLOWED_ORIGINS` 포함) |
| `build.gradle` | 라이브러리 의존성 설정 | |
| `settings.gradle` | 프로젝트 설정 | |
| `gradlew` | 실행 스크립트 (Linux용) | |
| `template/` | 프로젝트 템플릿 폴더 | **필수** (`Korean-Hangul.ufo, English-Latin.ufo` 포함) |

#### `/home/server/frontend/` (프론트엔드)
Next.js 프로젝트를 정적 내보내기(`npm run build` -> `out` 폴더 생성)한 뒤, 그 **`out` 폴더** 전체를 서버로 복사해야 합니다.

```
/home/server/
├── api/
│   ├── nginx/nginx.conf
│   └── docker-compose.yml
└── frontend/
    └── out/         <-- Next.js 정적 빌드 결과물 (index.html, _next/, 404.html 등)
```

### ❌ 제외할 폴더 (보내지 마세요)
- `db_data/` (DB 파일은 서버에서 새로 생성됨)
- `build/` (빌드 결과물은 서버에서 다시 빌드함)
- `.gradle/` (캐시는 서버에서 다시 받음)
- `.git/` (버전 관리 폴더는 불필요하게 큼)
- `.idea/`, `.vscode/` (IDE 설정 파일)

## 3. 배포 절차 (터미널)

### Step 1: 파일 전송 (SCP 사용 예시)
VM 서버의 IP가 `X.X.X.X`이고 계정이 `root`라고 가정:
```bash
# 로컬 터미널에서 실행 (프로젝트 루트 경로)
scp -r . root@X.X.X.X:/home/server/api
```

### Step 2: VM 접속 및 실행
```bash
ssh root@X.X.X.X
cd /home/server/api

# 도커 컨테이너 빌드 및 실행 (백그라운드)
docker-compose up -d --build
```

### Step 3: 확인
```bash
docker ps
# fontogether_api가 Port 80을 사용 중인지 확인
```

## 4. 주의사항 (K-Cloud 방화벽)
- **Port 80 (HTTP)**: 현재 설정이 80번 포트를 사용하므로 외부에서 `http://[VM_IP]`로 바로 접속 가능합니다.
- **Port 443 (HTTPS)**: 추후 SSL 인증서 적용 시 Nginx 등을 앞단에 두어 443 -> 80으로 포워딩하는 설정이 필요할 수 있습니다.
- **DB 접속**: 외부에서 DB(5432)로 직접 접속은 불가능합니다(방화벽). 개발용 PC에서 DB를 보고 싶다면 SSH 터널링을 이용하세요.
