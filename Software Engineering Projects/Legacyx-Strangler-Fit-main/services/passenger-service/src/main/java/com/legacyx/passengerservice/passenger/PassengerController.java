package com.legacyx.passengerservice.passenger;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/aviation/passengers")
public class PassengerController {

    private final PassengerRepository repository;
    private final String passportPepper;

    public PassengerController(PassengerRepository repository, @Value("${security.passport-pepper}") String passportPepper) {
        this.repository = repository;
        this.passportPepper = passportPepper;
    }

    @GetMapping
    public List<Passenger> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Passenger> getById(@PathVariable UUID id) {
        return repository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Passenger> create(@Valid @RequestBody CreatePassengerRequest request) {
        var passenger = new Passenger();
        passenger.setFullName(request.fullName());
        passenger.setPassportNumberHash(hash(request.passportNumber()));
        passenger.setNationality(request.nationality());
        passenger.setDateOfBirth(request.dateOfBirth());
        var saved = repository.save(passenger);
        return ResponseEntity.created(URI.create("/api/aviation/passengers/" + saved.getPassengerId())).body(saved);
    }

    // Salted SHA-256 — a real passport-verification system would use a
    // dedicated KMS-backed encryption service, but hashing (never
    // needing the plaintext back, only to confirm a match) is the
    // correct primitive here and needs no extra infrastructure for a demo.
    private String hash(String rawPassportNumber) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(
                    digest.digest((rawPassportNumber + passportPepper).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
