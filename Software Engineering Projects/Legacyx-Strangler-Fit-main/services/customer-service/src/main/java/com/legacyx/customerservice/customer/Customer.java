package com.legacyx.customerservice.customer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Modern shape per docs/architecture/overview.md's anti-corruption layer:
// legacy CustomerName -> fullName, legacy CustStatus -> status (ACTIVE/INACTIVE).
// customerNo is kept (not renamed) — it's the legacy business key, preserved
// deliberately so Phase 5's migration can match records across both databases.
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_no", unique = true)
    private String customerNo;

    @NotBlank
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String status = "ACTIVE";

    private String email;
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Customer(String customerNo, String fullName, String status, String email, String phone) {
        this.customerNo = customerNo;
        this.fullName = fullName;
        this.status = status;
        this.email = email;
        this.phone = phone;
    }
}
