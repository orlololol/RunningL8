package com.proj.backendrunninglate.controllers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.proj.backendrunninglate.requests.GenericRouteRequest;
import com.proj.backendrunninglate.requests.RouteRequest;
import com.proj.backendrunninglate.services.NavigationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/route")
public class RouteController {

    private final NavigationService navigationService;

    @Autowired
    public RouteController(NavigationService navigationService) {
        this.navigationService = navigationService;
    }

    @PostMapping
    public ResponseEntity<?> getRoute(@RequestBody RouteRequest request) {
       return navigationService.getRoute(request);
    }

    @PostMapping
    public ResponseEntity<?> getGenericRoute(@RequestBody GenericRouteRequest request) {
        return navigationService.getGenericRoute(request);
    }
}
