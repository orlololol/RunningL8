package com.proj.backendrunninglate.requests;

import java.util.List;
import lombok.Data;

@Data
public class AccountRequest {
    private String name;
    private String email;
    private String password;
}
