# Gradle Wrapper 다운로드 타임아웃 방지를 위해 Gradle이 미리 설치된 이미지를 사용합니다.
FROM gradle:jdk21-alpine AS builder
WORKDIR /app

# 소스 코드 복사 (Gradle 사용자는 권한 주의)
COPY --chown=gradle:gradle . .

# Gradle 빌드 실행 (Wrapper 대신 설치된 ungradle 사용)
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
COPY --from=builder /app/template /app/template
EXPOSE 80
ENTRYPOINT ["java", "-jar", "app.jar"]
