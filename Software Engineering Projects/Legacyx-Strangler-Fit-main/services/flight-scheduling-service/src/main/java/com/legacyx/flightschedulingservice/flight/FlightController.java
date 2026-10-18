package com.legacyx.flightschedulingservice.flight;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/aviation/flights")
public class FlightController {

    private final FlightRepository repository;
    private final FlightEventPublisher events;

    public FlightController(FlightRepository repository, FlightEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @GetMapping
    public List<Flight> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Flight> getById(@PathVariable UUID id) {
        return repository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Flight> create(@Valid @RequestBody CreateFlightRequest request) {
        var flight = new Flight();
        flight.setRouteId(request.routeId());
        flight.setTailNumber(request.tailNumber());
        flight.setScheduledDeparture(request.scheduledDeparture());
        var saved = repository.save(flight);
        return ResponseEntity.created(URI.create("/api/aviation/flights/" + saved.getFlightId())).body(saved);
    }

    // Gateway's PUT /admin/aviation/flights/{id}/status (FlightDispatcher-
    // gated, see gateway/Program.cs) proxies straight here. A transition
    // INTO Airborne emits FlightDepartedEvent — Crew Service reacts to it
    // independently, with zero coupling back to this service.
    @PutMapping("/{id}/status")
    public ResponseEntity<Flight> updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateStatusRequest request) {
        var flightOpt = repository.findById(id);
        if (flightOpt.isEmpty()) return ResponseEntity.notFound().build();

        var flight = flightOpt.get();
        var wasAirborne = flight.getStatus() == Flight.Status.Airborne;
        flight.setStatus(request.status());
        var saved = repository.save(flight);

        if (!wasAirborne && saved.getStatus() == Flight.Status.Airborne) {
            events.publishFlightDeparted(saved);
        }
        return ResponseEntity.ok(saved);
    }

    record CreateFlightRequest(
            @NotBlank String routeId,
            @NotBlank String tailNumber,
            @NotNull Instant scheduledDeparture
    ) {
    }

    record UpdateStatusRequest(@NotNull Flight.Status status) {
    }
}
