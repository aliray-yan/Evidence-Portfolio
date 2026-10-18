package com.legacyx.passengerservice.passenger;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "passengers")
@Getter
@Setter
@NoArgsConstructor
public class Passenger {

    @Id
    private UUID passengerId = UUID.randomUUID();

    @NotBlank
    @Column(name = "full_name", nullable = false)
    private String fullName;

    // Never serialized to a response — only PassengerController computes
    // this (salted SHA-256), and only to verify a match later, never to
    // recover the original passport number.
    @JsonIgnore
    @Column(name = "passport_number_hash", nullable = false)
    private String passportNumberHash;

    private String nationality;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
}
