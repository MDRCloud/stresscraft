# syntax=docker/dockerfile:1

# Build stage
FROM gradle:7.3.3-jdk17 AS build
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts gradle.properties gradlew gradlew.bat ./
COPY gradle gradle
COPY src src
RUN ./gradlew shadowJar --no-daemon

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar stresscraft.jar
EXPOSE 8080
ENTRYPOINT ["java","-cp","/app/stresscraft.jar","dev.cubxity.tools.stresscraft.web.StressCraftWebKt"]
