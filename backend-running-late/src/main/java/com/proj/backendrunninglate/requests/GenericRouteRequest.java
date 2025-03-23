package com.proj.backendrunninglate.requests;

import lombok.Data;

@Data
public class GenericRouteRequest {
    public double currentLat;
    public double currentLng;
    public double destinationLat;
    public double destinationLng;
}
