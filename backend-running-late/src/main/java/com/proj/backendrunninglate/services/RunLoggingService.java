package com.proj.backendrunninglate.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.proj.backendrunninglate.models.Account;
import com.proj.backendrunninglate.models.ActiveRun;
import com.proj.backendrunninglate.models.PastRun;
import com.proj.backendrunninglate.repositories.AccountRepository;
import com.proj.backendrunninglate.repositories.ActiveRunRepository;
import com.proj.backendrunninglate.repositories.PastRunRepository;
import com.proj.backendrunninglate.requests.RouteRequest;
import com.proj.backendrunninglate.requests.SaveRunRequest;
import com.proj.backendrunninglate.requests.StartRunRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class RunLoggingService {

    private final ObjectMapper objectMapper;
    private final NavigationService navigationService;
    private final PaceCalculationService paceCalculationService;
    private final AccountRepository accountRepository;
    private final ActiveRunRepository activeRunRepository;
    private final PastRunRepository pastRunRepository;

    public RunLoggingService(
            ObjectMapper objectMapper,
            NavigationService navigationService,
            AccountRepository accountRepository,
            PaceCalculationService paceCalculationService,
            ActiveRunRepository activeRunRepository,
            PastRunRepository pastRunRepository
    ) {
        this.objectMapper = objectMapper;
        this.navigationService = navigationService;
        this.accountRepository = accountRepository;
        this.paceCalculationService = paceCalculationService;
        this.activeRunRepository = activeRunRepository;
        this.pastRunRepository = pastRunRepository;
    }

    @Transactional
    public ResponseEntity<?> startRun(StartRunRequest startRunRequest) {
        Account account = accountRepository.findByEmail(startRunRequest.getEmail()).orElseThrow(
                () -> new IllegalArgumentException("Account does not exist")
        );

        if (account.getActiveRun() != null) {
            throw new IllegalStateException("An active run is already in progress for the user.");
        }

        Date date = new Date();
        Date dummyArrivalDate = new Date(date.getTime() + 1000 * 60 * 60 * 24);

        String pace = "balls"; // TODO: Replace with actual pace logic later

        ActiveRun activeRun = new ActiveRun(
                startRunRequest.getOriginLat(),
                startRunRequest.getOriginLng(),
                startRunRequest.getDestinationLat(),
                startRunRequest.getDestinationLng(),
                date,
                dummyArrivalDate,
                pace,
                account
        );

        RouteRequest routeRequest = new RouteRequest(
                startRunRequest.getEmail(),
                startRunRequest.getOriginLat(),
                startRunRequest.getOriginLng(),
                startRunRequest.getDestinationLat(),
                startRunRequest.getDestinationLng(),
                startRunRequest.getDistance(),
                startRunRequest.getNeededArrivalTime()
        );

        activeRunRepository.save(activeRun);
        account.setActiveRun(activeRun);
        accountRepository.save(account);

        ResponseEntity<?> routeData = navigationService.getRoute(routeRequest);

        if (routeData.getStatusCode() == HttpStatus.INTERNAL_SERVER_ERROR) {
            throw new IllegalArgumentException(String.valueOf(routeData.getBody()));
        }

        try {
            JsonNode root = objectMapper.readTree(routeData.getBody().toString());
            JsonNode firstRoute = root.path("routes").get(0);
            int distanceMeters = firstRoute.path("distanceMeters").asInt();

            account.getActiveRun().setDistance(distanceMeters);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\": \"" + e.getMessage() + "\"}");
        }

        return routeData;
    }

    @Transactional
    public ResponseEntity<?> endRun(SaveRunRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail()).orElseThrow(
                () -> new IllegalArgumentException("Account does not exist")
        );

        saveFinishedRun(request);

        if (account.getActiveRun() == null) {
            throw new IllegalStateException("No active run to end.");
        } else {
            ActiveRun temp = account.getActiveRun();
            account.setActiveRun(null);
            activeRunRepository.delete(temp);
            activeRunRepository.flush();
            accountRepository.save(account);
        }

        return ResponseEntity.ok().build();
    }

    public void saveFinishedRun(SaveRunRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail()).orElseThrow(
                () -> new IllegalArgumentException("Account does not exist")
        );

        if (account.getActiveRun() == null) {
            throw new IllegalStateException("No active run to save.");
        }

        ActiveRun run = account.getActiveRun();
        Date date = new Date();

        PastRun pastRun = new PastRun(
                run.getOriginLat(),
                run.getOriginLng(),
                run.getDestinationLat(),
                run.getDestinationLng(),
                run.getDistance(),
                "N/A",
                date
        );

        pastRunRepository.save(pastRun);

        // Clear the active run
        account.setActiveRun(null);
        activeRunRepository.delete(run);
        activeRunRepository.flush();
        accountRepository.save(account);
    }
}
