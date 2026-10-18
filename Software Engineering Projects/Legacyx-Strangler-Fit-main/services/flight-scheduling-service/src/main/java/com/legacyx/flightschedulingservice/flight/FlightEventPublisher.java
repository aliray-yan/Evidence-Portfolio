package com.legacyx.flightschedulingservice.flight;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

// Direct publish, not an outbox — unlike Booking & Ticketing (which the
// spec explicitly calls for a transactional outbox on), a lost
// FlightDepartedEvent here just means Crew Service starts a duty-hours
// clock a few seconds late on retry, not a money- or safety-critical
// gap, so the extra machinery isn't worth it.
@Component
public class FlightEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public FlightEventPublisher(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishFlightDeparted(Flight flight) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("flightId", flight.getFlightId());
        data.put("routeId", flight.getRouteId());
        data.put("tailNumber", flight.getTailNumber());
        data.put("departedAt", Instant.now().toString());

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", UUID.randomUUID().toString());
        envelope.put("eventType", "FlightDepartedEvent");
        envelope.put("timestamp", Instant.now().toString());
        envelope.put("correlationId", UUID.randomUUID().toString());
        envelope.put("source", "flight-scheduling-service");
        envelope.put("version", 1);
        envelope.put("data", data);

        try {
            kafkaTemplate.send("legacyx.aviation.flights", flight.getFlightId().toString(), mapper.writeValueAsString(envelope));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize FlightDepartedEvent", e);
        }
    }
}
