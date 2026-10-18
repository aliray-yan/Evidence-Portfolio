package com.legacyx.passengerservice.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "loyalty_accounts")
@Getter
@Setter
@NoArgsConstructor
public class LoyaltyAccount {

    public enum Tier { Silver, Gold, Platinum }

    @Id
    private UUID accountId = UUID.randomUUID();

    @Column(name = "passenger_id", nullable = false, unique = true)
    private UUID passengerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier_level", nullable = false)
    private Tier tierLevel = Tier.Silver;

    @Column(name = "miles_balance", nullable = false)
    private int milesBalance = 0;
}
