package com.proj.backendrunninglate.services;

import com.proj.backendrunninglate.models.Account;
import com.proj.backendrunninglate.models.PastRun;
import com.proj.backendrunninglate.repositories.AccountRepository;
import com.proj.backendrunninglate.repositories.PastRunRepository;
import com.proj.backendrunninglate.requests.AccountRequest;
import com.proj.backendrunninglate.responses.AccountResponse;
import com.proj.backendrunninglate.responses.PastRunResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final PastRunRepository pastRunRepository;

    @Autowired
    public AccountService(AccountRepository accountRepository, PastRunRepository pastRunRepository) {
        this.accountRepository = accountRepository;
        this.pastRunRepository = pastRunRepository;
    }

    @Transactional
    public AccountResponse createAccount(AccountRequest accountRequest) {

        if (accountRepository.existsByEmail(accountRequest.getEmail())) {
            throw new IllegalStateException("Email already taken");
        }

        Account account = new Account(
                accountRequest.getEmail(),
                accountRequest.getName(),
                accountRequest.getPassword()
        );

        accountRepository.save(account);
        System.out.println(account.getName() + " created");
        AccountResponse accountResponse = new AccountResponse();
        accountResponse.setName(account.getName());
        accountResponse.setEmail(account.getEmail());

        return accountResponse;
    }

    @Transactional
    public AccountResponse getAccount(String email) {

        Account account = accountRepository.findByEmail(email).orElseThrow(
                () -> new IllegalArgumentException("Account does not exist")
        );

        List<PastRun> pastRuns = pastRunRepository.findByAccountEmail(email);
        List<PastRunResponse> pastRunResponses = new ArrayList<>();

        for (PastRun pastRun : pastRuns) {
            PastRunResponse pastRunResponse = new PastRunResponse(
                    pastRun.getOriginLat(),
                    pastRun.getOriginLng(),
                    pastRun.getDestinationLat(),
                    pastRun.getDestinationLng(),
                    pastRun.getDistance(),
                    pastRun.getAveragePace(),
                    pastRun.getDate()
            );
            pastRunResponses.add(pastRunResponse);
        }
        return new AccountResponse(
                account.getName(),
                account.getEmail(),
                pastRunResponses
        );
    }

    // Update account later

    // Delete account later

}
