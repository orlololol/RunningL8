package com.proj.backendrunninglate.responses;

import lombok.Data;

import java.util.Date;

@Data
public class PastRunResponse {
    public double originLat;
    public double originLng;
    public double destinationLat;
    public double destinationLng;
    private int distance;
    private String averagePace;
    private Date date;

    public PastRunResponse(double originLat, double originLng, double destinationLat, double destinationLng, int distance, String averagePace, Date date) {
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.distance = distance;
        this.averagePace = averagePace;
        this.date = date;
    }
}
