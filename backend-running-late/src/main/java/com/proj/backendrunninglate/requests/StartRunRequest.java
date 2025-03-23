package com.proj.backendrunninglate.requests;

import lombok.Data;

@Data
public class StartRunRequest {

    private String email;
    public double originLat;
    public double originLng;
    public double destinationLat;
    public double destinationLng;
    private String distance;
    private String neededArrivalTime;

}
