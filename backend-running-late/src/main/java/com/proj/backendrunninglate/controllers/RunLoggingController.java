package com.proj.backendrunninglate.controllers;

import com.proj.backendrunninglate.requests.SaveRunRequest;
import com.proj.backendrunninglate.requests.StartRunRequest;
import com.proj.backendrunninglate.services.RunLoggingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/run")
public class RunLoggingController {

    private final RunLoggingService runLoggingService;

    @Autowired
    public RunLoggingController(RunLoggingService runLoggingService) {
        this.runLoggingService = runLoggingService;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startRun(@RequestBody StartRunRequest startRunRequest) {
        try {
            return runLoggingService.startRun(startRunRequest);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/end")
    public ResponseEntity<?> endRun(@RequestBody SaveRunRequest saveRunRequest) {
        try {
            return runLoggingService.endRun(saveRunRequest);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
