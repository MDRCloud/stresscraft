# syntax=docker/dockerfile:1

# ── Stage 1: Build the fat JAR ────────────────────────────────────
FROM gradle:7.3.3-jdk17 AS build
WORKDIR /app

# Cache dependency resolution layer
COPY build.gradle.kts settings.gradle.kts gradle.properties gradlew gradlew.bat ./
COPY gradle gradle

# Resolve dependencies (cached unless build files change)
RUN gradle dependencies --no-daemon -q || true

# Build the shadow JAR
COPY src src
RUN gradle shadowJar --no-daemon

# ── Stage 2: Lean JRE runtime ─────────────────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar stresscraft.jar

# Expose Ktor backend port (internal only — Nginx proxies in)
EXPOSE 8080

# Healthcheck used by Docker Compose and the Nginx upstream
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["java", \
    "-server", \
    "-XX:+UseG1GC", \
    "-XX:MaxGCPauseMillis=50", \
    "-cp", "/app/stresscraft.jar", \
    "dev.cubxity.tools.stresscraft.web.StressCraftWebKt"]
