package com.proj.backendrunninglate.controllers;

import com.proj.backendrunninglate.models.Account;
import com.proj.backendrunninglate.requests.AccountRequest;
import com.proj.backendrunninglate.services.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounts")
public class AccountController {

    private final AccountService accountService;

    @Autowired
    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createAccount(@RequestBody AccountRequest account) {
        try {
            return ResponseEntity.ok(accountService.createAccount(account));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/get/{email}")
    public ResponseEntity<?> getAccount(@PathVariable String email) {
        try {
            return ResponseEntity.ok(accountService.getAccount(email));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Account not found");
        }
    }


}
