package com.proj.backendrunninglate.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    private String name;

    private String password;

    @OneToOne
    private ActiveRun activeRun;

    public Account(String email, String name, String password) {
        this.email = email;
        this.name = name;
        this.password = password;
    }

    public Account() {}
}
