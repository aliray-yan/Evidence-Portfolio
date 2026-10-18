package com.legacyx.inventoryservice.product;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Product> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/sku/{sku}")
    public ResponseEntity<Product> getBySku(@PathVariable String sku) {
        return repository.findBySku(sku).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Bound from a request DTO, not the entity directly — @RequestBody
    // Product previously let a client set id/quantityReserved at creation.
    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody CreateProductRequest request) {
        if (repository.existsBySku(request.sku())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        Product product = new Product(request.sku(), request.name(), request.quantityOnHand(), request.unitPrice());
        Product saved = repository.save(product);
        return ResponseEntity.created(URI.create("/api/inventory/" + saved.getId())).body(saved);
    }

    @PostMapping("/{id}/reserve")
    public ResponseEntity<?> reserve(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        int quantity = body.getOrDefault("quantity", 0);
        // A non-positive quantity previously passed the "> available"
        // check for free (negative is never greater than available) and
        // then *decreased* quantityReserved via the += below — i.e.
        // reserve doubled as an uncontrolled release.
        if (quantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "quantity must be positive."));
        }
        var productOpt = repository.findById(id);
        if (productOpt.isEmpty()) return ResponseEntity.notFound().build();

        Product product = productOpt.get();
        if (quantity > product.getAvailable()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Only " + product.getAvailable() + " units available."));
        }
        product.setQuantityReserved(product.getQuantityReserved() + quantity);
        repository.save(product);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/release")
    public ResponseEntity<?> release(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        int quantity = body.getOrDefault("quantity", 0);
        // Same issue in reverse: a non-positive quantity would increase
        // quantityReserved past quantityOnHand instead of releasing stock.
        if (quantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "quantity must be positive."));
        }
        var productOpt = repository.findById(id);
        if (productOpt.isEmpty()) return ResponseEntity.notFound().build();

        Product product = productOpt.get();
        product.setQuantityReserved(Math.max(0, product.getQuantityReserved() - quantity));
        repository.save(product);
        return ResponseEntity.noContent().build();
    }
}
