package com.legacyx.passengerservice.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyx.passengerservice.loyalty.LoyaltyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

// Booking & Ticketing Service publishes once, with zero knowledge of who
// listens — same decoupling as retail's legacyx.orders topic. This is
// the only consumer of legacyx.aviation.tickets today.
@Component
public class TicketIssuedListener {

    private static final Logger log = LoggerFactory.getLogger(TicketIssuedListener.class);
    private static final int MILES_PER_UNIT_FARE = 5;

    private final LoyaltyRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public TicketIssuedListener(LoyaltyRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(topics = "legacyx.aviation.tickets", groupId = "passenger-service")
    public void onTicketIssued(String message) {
        try {
            JsonNode envelope = mapper.readTree(message);
            String eventType = envelope.path("eventType").asText();
            if (!"TicketIssuedEvent".equals(eventType)) {
                log.info("Ignoring event type {}", eventType);
                return;
            }

            JsonNode data = envelope.path("data");
            UUID passengerId = UUID.fromString(data.path("passengerId").asText());
            BigDecimal pricePaid = new BigDecimal(data.path("pricePaid").asText("0"));
            int milesEarned = pricePaid.multiply(BigDecimal.valueOf(MILES_PER_UNIT_FARE)).intValue();

            repository.findByPassengerId(passengerId).ifPresentOrElse(account -> {
                account.setMilesBalance(account.getMilesBalance() + milesEarned);
                repository.save(account);
                log.info("Credited {} miles to passenger {} (new balance {})", milesEarned, passengerId, account.getMilesBalance());
            }, () -> log.warn("TicketIssuedEvent for unknown passengerId={}, no loyalty account to credit", passengerId));
        } catch (Exception e) {
            log.error("Failed to process TicketIssuedEvent: {}", message, e);
        }
    }
}
