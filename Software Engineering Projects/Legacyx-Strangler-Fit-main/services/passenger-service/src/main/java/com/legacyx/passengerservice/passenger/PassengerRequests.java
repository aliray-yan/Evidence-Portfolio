package com.legacyx.passengerservice.passenger;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

// The raw passport number is only ever accepted here, never persisted —
// PassengerController hashes it before it ever reaches the entity.
record CreatePassengerRequest(
        @NotBlank @Size(max = 200) String fullName,
        @NotBlank @Size(min = 4, max = 50) String passportNumber,
        @NotBlank @Size(max = 100) String nationality,
        // @Past alone isn't enough: Bean Validation treats null as valid for
        // @Past (absence is @NotNull's job, not the range check's — the same
        // reasoning legacy-monolith/Models/AviationRequests.cs documents for
        // its own PastDateAttribute), so a body with no dateOfBirth at all
        // used to slip through and persist a null.
        //
        // @JsonFormat(pattern = "yyyy-MM-dd") matters independently of
        // validation: Jackson's default LocalDate deserializer special-cases
        // any string with 'T' at index 10 as a full timestamp and silently
        // truncates it to a date instead of rejecting it (and, for a string
        // with a numeric offset rather than "Z", fails in a way that
        // GlobalExceptionHandler was turning into a 500 — see there). Pinning
        // an explicit pattern replaces that lenient path with a plain
        // LocalDate.parse against yyyy-MM-dd, which rejects any trailing
        // time component outright — the same all-or-nothing parse
        // legacy-monolith's DateOnly? already does via System.Text.Json.
        // Without this, "no dateOfBirth", "a timestamp", and "a timestamp
        // with an offset" were three different silent divergences from the
        // legacy side; now all three get the same 400 both sides agree on.
        @NotNull @Past @JsonFormat(pattern = "yyyy-MM-dd") LocalDate dateOfBirth
) {
}
