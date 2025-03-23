package com.proj.backendrunninglate.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.proj.backendrunninglate.models.Account;
import com.proj.backendrunninglate.repositories.AccountRepository;
import com.proj.backendrunninglate.requests.GenericRouteRequest;
import com.proj.backendrunninglate.requests.RouteRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.client.RestTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class NavigationService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AccountRepository accountRepository;

    @Value("${google.api.key}")
    private String apiKey;

    @Autowired
    public NavigationService(RestTemplate restTemplate, ObjectMapper objectMapper, AccountRepository accountRepository) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.accountRepository = accountRepository;
    }

    @Transactional
    public ResponseEntity<?> getRoute(@RequestBody RouteRequest request) {
        String url = "https://routes.googleapis.com/directions/v2:computeRoutes";

        // Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Goog-Api-Key", apiKey);
        headers.set("X-Goog-FieldMask", "routes.legs.steps.distanceMeters,routes.polyline.encodedPolyline");

        Map<String, Object> body = new HashMap<>();
        Map<String, Object> origin = Map.of(
                "location", Map.of(
                        "latLng", Map.of("latitude", request.currentLat, "longitude", request.currentLng)
                )
        );
        Map<String, Object> destination = Map.of(
                "location", Map.of(
                        "latLng", Map.of("latitude", request.destinationLat, "longitude", request.destinationLng)
                )
        );
        body.put("origin", origin);
        body.put("destination", destination);
        body.put("travelMode", "WALK");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {

            Account account = accountRepository.findByEmail(request.getEmail()).orElseThrow(
                    () -> new IllegalArgumentException("Account does not exist")
            );

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            account.getActiveRun().setOriginLat(request.currentLat);
            account.getActiveRun().setOriginLng(request.currentLng);
            account.getActiveRun().setDestinationLat(request.destinationLat);
            account.getActiveRun().setDestinationLng(request.destinationLng);
            accountRepository.save(account);

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @Transactional
    public ResponseEntity<?> getGenericRoute(@RequestBody GenericRouteRequest request) {
        String url = "https://routes.googleapis.com/directions/v2:computeRoutes";

        // Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Goog-Api-Key", apiKey);
        headers.set("X-Goog-FieldMask", "routes.legs.steps.distanceMeters,routes.polyline.encodedPolyline");

        Map<String, Object> body = new HashMap<>();
        Map<String, Object> origin = Map.of(
                "location", Map.of(
                        "latLng", Map.of("latitude", request.currentLat, "longitude", request.currentLng)
                )
        );
        Map<String, Object> destination = Map.of(
                "location", Map.of(
                        "latLng", Map.of("latitude", request.destinationLat, "longitude", request.destinationLng)
                )
        );
        body.put("origin", origin);
        body.put("destination", destination);
        body.put("travelMode", "WALK");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
