# ── Étape 1 : build du JAR ────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copie les fichiers Maven et télécharge les dépendances (cache Docker)
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copie le code source et construit le JAR (sans les tests)
COPY src ./src
RUN ./mvnw package -DskipTests -q

# ── Étape 2 : image finale légère ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copie uniquement le JAR depuis l'étape de build
COPY --from=build /app/target/ticharmony-0.0.1-SNAPSHOT.jar app.jar

# Expose le port 8080
EXPOSE 8080

# Lance l'application avec le profil "prod"
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]