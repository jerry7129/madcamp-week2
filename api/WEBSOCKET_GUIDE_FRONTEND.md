# WebSocket 구현 가이드 (프론트엔드)

이 문서는 Fontogether 프로젝트에서 **SockJS**와 **STOMP**를 사용하여 실시간 기능을 구현하는 방법을 설명합니다.

## 1. 필수 라이브러리 설치 (Prerequisites)
React, Vue, Angular 등에서 필요한 패키지를 설치합니다:

```bash
npm install sockjs-client @stomp/stompjs
```

## 2. 기본 설정 (Default Configuration)
- **브로커 URL (VM 배포 환경)**: `http://172.10.5.122.nip.io/ws`
- **브로커 URL (로컬 개발 환경)**: `http://localhost:80/ws`

## 3. 연결 설정 (Connection Setup - React 예제)

```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const setupWebSocket = (projectId, userId) => {
    // 1. 클라이언트 초기화
    const client = new Client({
        webSocketFactory: () => new SockJS('http://172.10.5.122.nip.io/ws'), // VM 주소 사용
        reconnectDelay: 5000, // 자동 재연결 대기 시간 (5초)
        debug: (str) => {
            console.log(str);
        },
        onConnect: () => {
            console.log('WebSocket에 연결되었습니다.');
            
            // 2. 토픽 구독 (데이터 수신 대기)
            subscribeToTopics(client, projectId, userId);
            
            // 3. 입장 메시지 전송 (접속 알림)
            client.publish({
                destination: '/app/project/join',
                body: JSON.stringify({ projectId, userId, nickname: 'User' + userId })
            });
        },
        onStompError: (frame) => {
            console.error('브로커 에러 발생: ' + frame.headers['message']);
            console.error('상세 정보: ' + frame.body);
        }
    });

    client.activate();
    return client;
};
```

## 4. 토픽 구독 (Subscribing - 데이터 수신)

다양한 실시간 업데이트에 대한 핸들러를 정의합니다.

```javascript
const subscribeToTopics = (client, projectId, myUserId) => {
    // A. 글리프 업데이트 (그리기 데이터)
    client.subscribe(`/topic/project/${projectId}/glyph/update`, (message) => {
        const payload = JSON.parse(message.body);
        if (payload.userId === myUserId) return; // 내가 보낸 건 무시 (이미 내 화면엔 그려져 있으므로)
        
        console.log(`${payload.nickname}님이 글리프를 수정함:`, payload);
        // Canvas UI 업데이트 로직...
    });

    // B. 프로젝트 상세 정보 (커닝, 피처, 메타데이터)
    client.subscribe(`/topic/project/${projectId}/update/details`, (message) => {
        const payload = JSON.parse(message.body);
        console.log(`프로젝트 상세 업데이트 [${payload.updateType}]:`, payload.data);
        
        if (payload.updateType === 'FEATURES') {
            const features = JSON.parse(payload.data);
            // features.languagesystems, features.tables, features.lookups... 등으로 활용
        }
    });

    // C. 사용자 접속 현황 (입장/퇴장)
    client.subscribe(`/topic/project/${projectId}/presence`, (message) => {
        const presences = JSON.parse(message.body); // 현재 접속 중인 유저 리스트
        console.log('현재 접속자 목록:', presences);
    });

    // D. 강퇴 알림 (강제 로그아웃)
    client.subscribe(`/topic/project/${projectId}/kick`, (message) => {
        const payload = JSON.parse(message.body);
        
        // 중요: 모든 클라이언트에게 오므로 내 ID인지 꼭 확인해야 함!
        console.log('강퇴 알림 수신:', payload); 
        
        if (Number(payload.kickedUserId) === Number(myUserId)) {
            alert('프로젝트에서 추방되었습니다.');
            window.location.href = '/'; // 메인으로 리다이렉트
        }
    });
};
```

## 5. 메시지 전송 (Sending Messages - 데이터 송신)

사용자가 변경 사항을 만들었을 때, 서버 엔드포인트(`/app/...`)로 메시지를 보냅니다.

### A. 글리프 업데이트 (그리기)
```javascript
// 안전한 전송을 위한 래퍼 함수 예시
const safelyPublish = (client, destination, body) => {
    if (client && client.active) {
        client.publish({
            destination: destination,
            body: JSON.stringify(body)
        });
    } else {
        console.warn('WebSocket이 연결되지 않아 메시지를 보낼 수 없습니다.');
    }
};

// 사용 예시
safelyPublish(client, '/app/glyph/update', {
    projectId: 1,
    glyphName: 'A',
    unicodes: [65], 
    outlineData: JSON.stringify(currentContours),
    advanceWidth: 600,
    userId: 1,
    nickname: 'MyNick'
});
```

### B. 프로젝트 상세 업데이트 (피처, 커닝 등)
```javascript
// 예시: Features 저장
const featuresData = {
    languagesystems: [...],
    classes: [...],
    lookups: [...],
    features: [...]
};

client.publish({
    destination: '/app/project/update/details',
    body: JSON.stringify({
        projectId: 1,
        userId: 1,
        updateType: 'FEATURES', // 또는 'KERNING', 'GROUPS', 'META_INFO', 'LayerConfig', 'LIB'
        data: JSON.stringify(featuresData)
    })
});
```

### C. 편집 시작 알림 (잠금/표시 기능)
```javascript
client.publish({
    destination: '/app/glyph/start-editing',
    body: JSON.stringify({
        projectId: 1,
        userId: 1,
        editingUnicode: '0041' // 'A'
    })
});
```

### D. 글리프 관리 (추가, 삭제, 이름변경, 순서변경)
새로운 `/app/glyph/action` 엔드포인트를 사용합니다.

```javascript
// 1. 이름 변경 (RENAME)
client.publish({
    destination: '/app/glyph/action',
    body: JSON.stringify({
        projectId: 1,
        action: 'RENAME',
        glyphName: 'oldName',
        newName: 'newName'
    })
});

// 2. 삭제 (DELETE)
client.publish({
    destination: '/app/glyph/action',
    body: JSON.stringify({
        projectId: 1,
        action: 'DELETE',
        glyphName: 'targetName'
    })
});

// 3. 추가 (ADD)
client.publish({
    destination: '/app/glyph/action',
    body: JSON.stringify({
        projectId: 1,
        action: 'ADD',
        glyphName: 'NewGlyph' // 빈 글리프 생성됨
    })
});

// 4. 순서 변경 (REORDER - 전체 리스트 교체)
client.publish({
    destination: '/app/glyph/action',
    body: JSON.stringify({
        projectId: 1,
        action: 'REORDER',
        newOrder: ['A', 'B', 'NewGlyph', 'C'] // 전체 이름 리스트
    })
});

// 5. 순서 이동 (MOVE - 단일 글리프 이동)
client.publish({
    destination: '/app/glyph/action',
    body: JSON.stringify({
        projectId: 1,
        action: 'MOVE',
        glyphName: 'A',
        toIndex: 1 // 0-based index
    })
});
```

// ... (Previous content)

## 6. 연결 해제 및 리소스 정리 (Cleanup - 중요!)

페이지 이동(라우팅)이나 로그아웃 시 **반드시** WebSocket 연결을 명시적으로 해제해야 합니다. 그렇지 않으면 서버는 브라우저 탭이 닫히거나 타임아웃될 때까지 사용자가 계속 접속해 있는 것으로 판단하여 **참여자 수(Count)가 줄어들지 않습니다.**

### React `useEffect` Cleanup 예제

컴포넌트가 언마운트될 때 `client.deactivate()`를 호출해야 합니다.

```javascript
useEffect(() => {
    // 1. 연결 시작
    const client = setupWebSocket(projectId, userId);

    // 2. Cleanup 함수 (언마운트/페이지 이동 시 실행됨)
    return () => {
        if (client && client.active) {
            console.log('페이지 이동: WebSocket 연결을 해제합니다.');
            client.deactivate(); // 서버에 DISCONNECT 프레임 전송 -> 즉시 Count 감소
        }
    };
}, [projectId, userId]);
```

### 로그아웃 시 처리

로그아웃 버튼 클릭 시에도 토큰 삭제 및 리다이렉트 **전에** 소켓을 끊어주는 것이 좋습니다.

```javascript
const handleLogout = () => {
    if (stompClient) {
        stompClient.deactivate();
    }
    // ... 토큰 삭제 및 라우팅
    localStorage.removeItem('token');
    window.location.href = '/login';
};
```
