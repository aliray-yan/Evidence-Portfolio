package com.legacyx.inventoryservice.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

// The Product entity used to be bound directly from the request body via
// @RequestBody Product, which let a client set id and, critically,
// quantityReserved directly — i.e. create stock that's already "reserved"
// out of thin air. This DTO only exposes fields a caller should control;
// quantityReserved always starts at 0, set server-side.
record CreateProductRequest(
        @NotBlank @Size(max = 50) String sku,
        @NotBlank @Size(max = 200) String name,
        @Min(0) int quantityOnHand,
        @DecimalMin("0.0") BigDecimal unitPrice
) {
}
