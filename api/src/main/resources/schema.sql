-- 기존 테이블이 있다면 삭제 (개발 단계라 편의상 추가 / 배포 땐 주의!)
-- DROP TABLE IF EXISTS glyph;
-- DROP TABLE IF EXISTS project_collaborators;
-- DROP TABLE IF EXISTS font_project;
-- DROP TABLE IF EXISTS glyphs;
-- DROP TABLE IF EXISTS projects; -- 구 버전 테이블 삭제 보장
-- DROP TABLE IF EXISTS users CASCADE;

-- -- 테스트 유저 생성 (비번: password123)
-- INSERT INTO users (email, password, nickname) 
-- VALUES ('test@font.com', '$2a$10$N.zmdr9k7uOCQb376NoUnutj8iAt6ValmpBk8O3s5.wKkQz6Fv.aO', 'Seunggwan');

-- -- 프로젝트 생성
-- -- 프로젝트 생성
-- INSERT INTO font_project (owner_id, title) 
-- VALUES (1, 'My First Font');

-- -- 'A' 글자 생성 (빈 껍데기)
-- INSERT INTO glyph (project_id, unicodes, glyph_name) 
-- VALUES (1, ARRAY['0041'], 'A');

-- 1. 사용자 테이블 (OAuth2 지원)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255), -- 소셜 로그인 시 null 가능
    nickname VARCHAR(50) NOT NULL,
    
    -- OAuth 관련 필드
    provider VARCHAR(20) DEFAULT 'local', -- 'local', 'google', 'kakao'
    provider_id VARCHAR(255),             -- 소셜 서비스의 고유 유저 ID
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 폰트 프로젝트 테이블 (UFO 3 구조)
CREATE TABLE IF NOT EXISTS font_project (
    project_id      BIGSERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,      -- 프로젝트 이름
    owner_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 생성자 ID (User 삭제시 프로젝트도 삭제)
    
    -- UFO 핵심 메타데이터들 (JSONB로 저장)
    meta_info       JSONB,  -- metainfo.plist (버전 정보 등)
    font_info       JSONB,  -- fontinfo.plist (폰트 패밀리명, 저작권, 수치값 등)
    groups          JSONB,  -- groups.plist (커닝 그룹 등)
    kerning         JSONB,  -- kerning.plist (커닝 값)
    features        JSONB,  -- features.fea (Parsed structure: prefix, classes, features)
    
    -- 레이어 관리 (layercontents.plist)
    layer_config    JSONB,  -- 레이어 목록 및 순서 정의
    
    -- 라이브러리 (lib.plist)
    lib             JSONB,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 협업자 테이블 (M:N 관계)
CREATE TABLE IF NOT EXISTS project_collaborators (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES font_project(project_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'EDITOR', -- 'OWNER', 'EDITOR', 'VIEWER'
    joined_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(project_id, user_id) -- 중복 초대 방지
);

-- 4. 글리프(글자) 테이블 (UFO 3 구조)
CREATE TABLE IF NOT EXISTS glyph (
    -- 1. 식별자 및 관계
    glyph_uuid      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      BIGINT NOT NULL,
    layer_name      VARCHAR(50) DEFAULT 'public.default', -- UFO 레이어 구분
    
    -- 2. 핵심 속성 (XML의 Top-level 속성)
    glyph_name      VARCHAR(255) NOT NULL,    -- <glyph name="A">
    format_version  INTEGER DEFAULT 2,        -- <glyph format="2">
    
    -- 3. 검색 및 레이아웃용 컬럼 (자주 조회됨)
    -- <unicode hex="XXXX"> 태그가 여러 개일 수 있으므로 배열(Array) 타입 사용
    unicodes        VARCHAR(10)[],            
    
    -- <advance width="500" height="0">
    advance_width   INTEGER DEFAULT 0,        
    advance_height  INTEGER DEFAULT 0,        
    
    -- 4. 핵심 벡터 데이터 (Heavy Data)
    -- <outline> 태그 내부의 contour, component, point 정보를 JSON으로 구조화하여 저장
    outline_data    JSONB, 
    
    -- 5. 기타 속성 (Light Data)
    -- <anchor>, <guideline>, <image>, <note>, <lib> 등을 하나의 JSON 객체로 묶어서 저장
    properties      JSONB DEFAULT '{}',       
    
    -- 6. 시스템 관리용 (협업용)
    last_modified_by VARCHAR(255),
    sort_order       INTEGER,         -- glyph sorting order
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 및 유니크 제약조건
    FOREIGN KEY (project_id) REFERENCES font_project(project_id) ON DELETE CASCADE,
    UNIQUE (project_id, layer_name, glyph_name) 
);

-- 검색 성능을 위한 인덱스
-- 인덱스는 IF NOT EXISTS 구문이 DB에 따라 다름 (PostgreSQL 9.5+ 지원)
CREATE INDEX IF NOT EXISTS idx_glyph_project ON glyph(project_id);
CREATE INDEX IF NOT EXISTS idx_glyph_unicodes ON glyph USING GIN (unicodes); -- 유니코드로 검색 시 빠름