package com.legacyx.passengerservice.loyalty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/aviation/loyalty")
public class LoyaltyController {

    private final LoyaltyRepository repository;

    public LoyaltyController(LoyaltyRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<LoyaltyAccount> getAll() {
        return repository.findAll();
    }

    @GetMapping("/passenger/{passengerId}")
    public ResponseEntity<LoyaltyAccount> getByPassenger(@PathVariable UUID passengerId) {
        return repository.findByPassengerId(passengerId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Enrollment only — milesBalance always starts at 0 and is never
    // client-settable; it only ever moves via TicketIssuedListener
    // reacting to a real ticket purchase.
    @PostMapping
    public ResponseEntity<LoyaltyAccount> enroll(@Valid @RequestBody EnrollRequest request) {
        if (repository.findByPassengerId(request.passengerId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        var account = new LoyaltyAccount();
        account.setPassengerId(request.passengerId());
        var saved = repository.save(account);
        return ResponseEntity.created(URI.create("/api/aviation/loyalty/passenger/" + saved.getPassengerId())).body(saved);
    }

    record EnrollRequest(@NotNull UUID passengerId) {
    }
}
