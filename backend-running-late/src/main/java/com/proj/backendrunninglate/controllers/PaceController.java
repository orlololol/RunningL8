package com.proj.backendrunninglate.controllers;

import com.proj.backendrunninglate.responses.PaceResponse;
import com.proj.backendrunninglate.services.PaceCalculationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/pace")
public class PaceController {

    private final PaceCalculationService paceCalculationService;

    public PaceController(PaceCalculationService paceCalculationService) {
        this.paceCalculationService = paceCalculationService;
    }

    @GetMapping("/{email}")
    public ResponseEntity<?> getPace(@PathVariable String email) {
        return null;
        //return paceCalculationService.calculatePace(email);
    }

}
