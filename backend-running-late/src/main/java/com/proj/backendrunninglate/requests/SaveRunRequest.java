package com.proj.backendrunninglate.requests;

import lombok.Data;

import java.util.Date;

@Data
public class SaveRunRequest {

    private String email;
    private Date timeFinished;

}
