package com.legacyx.customerservice.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// The Customer entity used to be bound directly from the request body via
// @RequestBody Customer, which let a client set id, createdAt, and (on
// create) status directly. These DTOs only expose fields a caller should
// actually control; server-managed fields are never client-settable.

record CreateCustomerRequest(
        @NotBlank @Size(max = 50) String customerNo,
        @NotBlank @Size(max = 200) String fullName,
        @Email @Size(max = 200) String email,
        @Size(max = 50) String phone
) {
}

record UpdateCustomerRequest(
        @NotBlank @Size(max = 200) String fullName,
        @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE") String status,
        @Email @Size(max = 200) String email,
        @Size(max = 50) String phone
) {
}
