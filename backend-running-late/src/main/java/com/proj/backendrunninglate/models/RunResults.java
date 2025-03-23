package com.proj.backendrunninglate.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
@Entity
public class RunResults {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Date arrivalTime;

    private Date neededArrivalTime;

    @ManyToOne
    private PastRun pastRun;

}
