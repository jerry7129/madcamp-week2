# Copilot Instructions for Fontogether API

## Overview
This project is a Spring Boot application designed to manage glyphs. It utilizes a layered architecture with clear service boundaries and follows specific conventions for coding and testing.

## Architecture
- **Main Components**: The application is structured around controllers, services, and repositories. The `TestDbController` is responsible for handling HTTP requests related to glyph management.
- **Data Flow**: Requests to `/test/db/glyph` are processed by `TestDbController`, which interacts with `GlyphService` to perform operations on glyph data.
- **Service Boundaries**: Each service is responsible for a specific domain, promoting separation of concerns.

## Developer Workflows
- **Building the Project**: Use the Gradle wrapper to build the project:
  ```bash
  ./gradlew build
  ```
- **Running the Application**: Start the application with:
  ```bash
  ./gradlew bootRun
  ```
- **Testing**: Run tests using:
  ```bash
  ./gradlew test
  ```

## Project Conventions
- **Naming Conventions**: Classes are named using CamelCase, while methods use camelCase. Constants are in uppercase.
- **Annotations**: Use Lombok annotations like `@RequiredArgsConstructor` for boilerplate code reduction.

## Integration Points
- **External Dependencies**: The project uses Spring Boot and Lombok. Ensure these dependencies are included in your `build.gradle` file:
  ```gradle
  dependencies {
      implementation 'org.springframework.boot:spring-boot-starter'
      compileOnly 'org.projectlombok:lombok'
      annotationProcessor 'org.projectlombok:lombok'
  }
  ```
- **Cross-Component Communication**: Services communicate through method calls, and controllers handle HTTP requests to route them to the appropriate service.

## Key Files
- **`build.gradle`**: Contains project dependencies and configurations.
- **`TestDbController.java`**: Example of a REST controller handling glyph-related requests.

## Conclusion
This document provides a foundational understanding of the Fontogether API's structure and conventions. For further details, refer to the specific files mentioned above.