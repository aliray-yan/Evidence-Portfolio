package com.legacyx.flightschedulingservice.route;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "routes")
@Getter
@Setter
@NoArgsConstructor
public class Route {

    @Id
    @Column(name = "route_id")
    private String routeId; // e.g. "LHR-JFK"

    @Column(name = "origin_airport", nullable = false, length = 3)
    private String originAirport;

    @Column(name = "destination_airport", nullable = false, length = 3)
    private String destinationAirport;

    @Column(name = "distance_miles", nullable = false)
    private int distanceMiles;
}
