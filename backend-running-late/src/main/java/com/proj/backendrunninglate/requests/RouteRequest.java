package com.proj.backendrunninglate.requests;

import lombok.Data;

@Data
public class RouteRequest {

    private String email;
    public double currentLat;
    public double currentLng;
    public double destinationLat;
    public double destinationLng;
    private String distance;
    private String neededArrivalTime;
    
    public RouteRequest(String email, double currentLat, double currentLng, double destinationLat, double destinationLng, String distance, String neededArrivalTime) {
        this.email = email;
        this.currentLat = currentLat;
        this.currentLng = currentLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.distance = distance;
        this.neededArrivalTime = neededArrivalTime;
    }
    
    
}