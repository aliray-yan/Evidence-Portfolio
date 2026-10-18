package com.legacyx.flightschedulingservice.route;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/aviation/routes")
public class RouteController {

    private final RouteRepository repository;

    public RouteController(RouteRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Route> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{routeId}")
    public ResponseEntity<Route> getById(@PathVariable String routeId) {
        return repository.findById(routeId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Route> create(@Valid @RequestBody CreateRouteRequest request) {
        if (repository.existsById(request.routeId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        var route = new Route();
        route.setRouteId(request.routeId());
        route.setOriginAirport(request.originAirport());
        route.setDestinationAirport(request.destinationAirport());
        route.setDistanceMiles(request.distanceMiles());
        var saved = repository.save(route);
        return ResponseEntity.created(URI.create("/api/aviation/routes/" + saved.getRouteId())).body(saved);
    }

    record CreateRouteRequest(
            @NotBlank @Pattern(regexp = "[A-Z0-9-]{3,20}") String routeId,
            @NotBlank @Pattern(regexp = "[A-Z]{3}") String originAirport,
            @NotBlank @Pattern(regexp = "[A-Z]{3}") String destinationAirport,
            @Positive int distanceMiles
    ) {
    }
}
