package com.proj.backendrunninglate.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Entity
@Getter
@Setter
public class ActiveRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double originLat;
    private double originLng;
    private double destinationLat;
    private double destinationLng;

    private Date startTime;
    private Date neededArrivalTime;

    private String paceNeeded;
    private int distance;

    @ManyToOne(optional = false)
    private Account account;

    public ActiveRun() {}

    public ActiveRun(
            double originLat,
            double originLng,
            double destinationLat,
            double destinationLng,
            Date startTime,
            Date neededArrivalTime,
            String paceNeeded,
            Account account
    ) {
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.startTime = startTime;
        this.neededArrivalTime = neededArrivalTime;
        this.paceNeeded = paceNeeded;
        this.account = account;
    }
}
