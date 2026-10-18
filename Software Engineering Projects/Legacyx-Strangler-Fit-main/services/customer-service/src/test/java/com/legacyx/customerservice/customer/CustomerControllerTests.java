package com.legacyx.customerservice.customer;

// Representative example, not exhaustive across every controller —
// see docs/architecture/testing.md. @WebMvcTest + MockMvc is the
// standard Spring Boot pattern for testing the web layer in isolation,
// with the repository mocked rather than hitting a real database.
// spring-boot-starter-test (already a pom.xml dependency) covers
// everything used here — no new dependency needed for this file.
// Same Maven Central limitation as the rest of this service applies:
// written to the pattern correctly, not run here — see MANUAL.md.

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomerController.class)
class CustomerControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CustomerRepository repository;

    @Test
    void getAll_returnsEmptyList_whenNoCustomersExist() throws Exception {
        when(repository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void create_returnsCreated_withValidCustomer() throws Exception {
        Customer saved = new Customer("C100", "Test Customer", "ACTIVE", null, null);
        when(repository.existsByCustomerNo("C100")).thenReturn(false);
        when(repository.save(any(Customer.class))).thenReturn(saved);

        String body = "{\"customerNo\":\"C100\",\"fullName\":\"Test Customer\",\"status\":\"ACTIVE\"}";

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void create_returnsConflict_whenCustomerNoAlreadyExists() throws Exception {
        when(repository.existsByCustomerNo("C100")).thenReturn(true);

        String body = "{\"customerNo\":\"C100\",\"fullName\":\"Test Customer\",\"status\":\"ACTIVE\"}";

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void getById_returnsNotFound_forUnknownId() throws Exception {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/customers/999"))
                .andExpect(status().isNotFound());
    }
}
