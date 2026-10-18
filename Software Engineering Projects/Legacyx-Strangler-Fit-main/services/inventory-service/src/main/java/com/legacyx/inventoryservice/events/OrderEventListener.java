package com.legacyx.inventoryservice.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyx.inventoryservice.product.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

// Second consumer of legacyx.orders, alongside notification-service —
// this is the actual point of Kafka here: Order Service publishes once,
// with zero knowledge of who's listening or how many listeners there
// are. See docs/architecture/event-architecture.md.
@Component
public class OrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);
    // A single order shouldn't have thousands of line items — this bounds
    // the work one Kafka message can trigger (each item is a separate
    // repository.save()) against a malformed or hostile message on this
    // unauthenticated, unencrypted broker topic.
    private static final int MAX_ITEMS_PER_ORDER = 1000;
    private final ProductRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public OrderEventListener(ProductRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(topics = "legacyx.orders", groupId = "inventory-service")
    public void onOrderEvent(String message) {
        try {
            JsonNode envelope = mapper.readTree(message);
            String eventType = envelope.path("eventType").asText();
            if (!"OrderCreated".equals(eventType)) {
                log.info("Ignoring event type {}", eventType);
                return;
            }

            JsonNode items = envelope.path("data").path("items");
            if (items.size() > MAX_ITEMS_PER_ORDER) {
                log.warn("OrderCreated event has {} items, exceeding {} — skipping", items.size(), MAX_ITEMS_PER_ORDER);
                return;
            }

            for (JsonNode item : items) {
                reserve(item.path("sku").asText(), item.path("quantity").asInt());
            }
        } catch (Exception e) {
            log.error("Failed to process order event: {}", message, e);
        }
    }

    private void reserve(String sku, int quantity) {
        repository.findBySku(sku).ifPresentOrElse(
                product -> {
                    product.setQuantityReserved(product.getQuantityReserved() + quantity);
                    repository.save(product);
                    log.info("Reserved {} units of {} for new order (available now {})",
                            quantity, sku, product.getAvailable());
                },
                () -> log.warn("OrderCreated referenced unknown sku={}, nothing to reserve", sku)
        );
    }
}
