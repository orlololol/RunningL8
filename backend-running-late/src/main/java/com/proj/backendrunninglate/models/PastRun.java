package com.proj.backendrunninglate.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Entity
@Getter
@Setter
public class PastRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public double originLat;
    
    public double originLng;
    
    public double destinationLat;
    
    public double destinationLng;

    private int distance;

    private String averagePace;

    private Date date;

    @ManyToOne
    private Account account;

    public PastRun() {}

    public PastRun(double originLat, double originLng, double destinationLat, double destinationLng, int distance, String averagePace, Date date) {
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.distance = distance;
        this.averagePace = averagePace;
        this.date = date;
    }

}
