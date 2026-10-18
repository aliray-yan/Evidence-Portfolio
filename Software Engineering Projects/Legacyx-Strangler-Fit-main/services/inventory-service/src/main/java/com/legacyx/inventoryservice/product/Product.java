package com.legacyx.inventoryservice.product;

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

import java.math.BigDecimal;

// Unlike Customer (CustomerNo) and Order (needed customerNo/sku to avoid
// internal-ID coupling), Product's legacy shape was already a clean
// business key — sku carries over as-is, no anti-corruption renaming needed.
@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String sku;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(name = "quantity_on_hand", nullable = false)
    private int quantityOnHand = 0;

    @Column(name = "quantity_reserved", nullable = false)
    private int quantityReserved = 0;

    private BigDecimal unitPrice;

    public Product(String sku, String name, int quantityOnHand, BigDecimal unitPrice) {
        this.sku = sku;
        this.name = name;
        this.quantityOnHand = quantityOnHand;
        this.unitPrice = unitPrice;
    }

    // Computed, not stored — Jackson serializes this into the JSON response
    // same as any other getter, so clients get "available" without the
    // legacy pattern of computing onHand - reserved themselves.
    public int getAvailable() {
        return quantityOnHand - quantityReserved;
    }
}
