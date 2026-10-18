package com.legacyx.inventoryservice.events;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

// Without this, a transient failure in OrderEventListener (e.g. the DB
// being briefly unreachable during a reserve()) would silently drop
// that reservation — the exception gets caught and logged, but nothing
// retries it. This wires in Spring Kafka's own retry support instead of
// hand-rolling it: 3 attempts, 1 second apart, then give up on that
// message and move on rather than blocking the whole consumer forever.
@Configuration
public class KafkaErrorHandlingConfig {

    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        FixedBackOff backOff = new FixedBackOff(1000L, 3L);
        return new DefaultErrorHandler(backOff);
    }
}
