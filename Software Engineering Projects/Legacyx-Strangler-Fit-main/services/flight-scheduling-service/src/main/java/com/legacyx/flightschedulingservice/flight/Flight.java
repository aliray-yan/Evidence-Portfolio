package com.legacyx.flightschedulingservice.flight;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "flights")
@Getter
@Setter
@NoArgsConstructor
public class Flight {

    public enum Status { Scheduled, Boarding, Airborne, Landed, Delayed }

    @Id
    private UUID flightId = UUID.randomUUID();

    @Column(name = "route_id", nullable = false)
    private String routeId;

    @Column(name = "tail_number", nullable = false)
    private String tailNumber;

    @Column(name = "scheduled_departure", nullable = false)
    private Instant scheduledDeparture;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.Scheduled;
}
