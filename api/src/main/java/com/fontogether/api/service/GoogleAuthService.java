package com.fontogether.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    // Production: http://172.10.5.122.nip.io/login/oauth2/code/google (Must match Google Console)
    // Dev: http://localhost:80/login/oauth2/code/google
    // Note: The REDIRECT_URI sent here must match PRECISELY what the frontend used to get the code.
    // We might need to accept this as a parameter if it changes between envs, 
    // but for now let's assume the frontend sends the code obtained via the prod redirect URI.
    
    // We allow the client to specify the redirect_uri used (for local vs prod flexibility)
    // But we can fallback to config if null
    @Value("${app.google.redirect-uri:http://172.10.5.122.nip.io/login/oauth2/code/google}")
    private String defaultRedirectUri; 

    public String getAccessToken(String authorizationCode, String redirectUri) {
        String tokenEndpoint = "https://oauth2.googleapis.com/token";
        
        String finalRedirectUri = (redirectUri != null && !redirectUri.isEmpty()) ? redirectUri : defaultRedirectUri;

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", authorizationCode);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", finalRedirectUri);
        params.add("grant_type", "authorization_code");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(tokenEndpoint, request, String.class);
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("access_token").asText();
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to retrieve access token from Google");
        }
        return null;
    }

    public JsonNode getUserInfo(String accessToken) {
        String userInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(userInfoEndpoint, HttpMethod.GET, request, String.class);
            if (response.getStatusCode() == HttpStatus.OK) {
                return objectMapper.readTree(response.getBody());
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to retrieve user info from Google");
        }
        return null;
    }
}
