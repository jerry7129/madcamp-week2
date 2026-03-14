package com.fontogether.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class ApiApplication {

	public static void main(String[] args) {
		loadEnv();
		SpringApplication.run(ApiApplication.class, args);
	}

	private static void loadEnv() {
		Path envPath = Paths.get(".env");
		if (Files.exists(envPath)) {
			try (Stream<String> lines = Files.lines(envPath)) {
				lines.filter(line -> line.contains("=") && !line.trim().startsWith("#"))
					.forEach(line -> {
						String[] parts = line.split("=", 2);
						if (parts.length == 2) {
							String key = parts[0].trim();
							String value = parts[1].trim();
							// Remove quotes if present
							if (value.startsWith("\"") && value.endsWith("\"")) {
								value = value.substring(1, value.length() - 1);
							}
							System.setProperty(key, value);
						}
					});
			} catch (IOException e) {
				System.err.println("Failed to load .env file: " + e.getMessage());
			}
		}
	}

}
