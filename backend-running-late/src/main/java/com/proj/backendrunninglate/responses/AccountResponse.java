package com.proj.backendrunninglate.responses;

import lombok.Data;

import java.util.List;

@Data
public class AccountResponse{
    private String name;
    private String email;
    private List<PastRunResponse> pastRuns;

    public AccountResponse(String name, String email, List<PastRunResponse> pastRuns) {
        this.name = name;
        this.email = email;
        this.pastRuns = pastRuns;
    }

    public AccountResponse() {}

}
