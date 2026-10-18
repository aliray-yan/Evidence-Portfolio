using System.ComponentModel.DataAnnotations;

namespace LegacyMonolith.Models;

// Request DTOs for every POST/PUT endpoint — the entities themselves used
// to be bound directly from the request body, which let a client set
// server-managed fields (Id, CreatedAt, computed totals, Status) at
// creation time. These are deliberately narrow: only the fields a caller
// should ever control, with validation attributes [ApiController] enforces
// automatically (400 on failure, no extra wiring needed).
//
// Attributes go directly on the record's constructor parameters, NOT
// `[property: ...]` — ASP.NET Core's model validation for record primary
// constructors throws InvalidOperationException at request time if
// validation metadata is attached to the generated property instead of
// the parameter ("has validation metadata defined on property 'X' that
// will be ignored"). Found by actually exercising these endpoints, not
// by inspection.

public record CreateCustomerRequest(
    [Required, StringLength(50)] string CustomerNo,
    [Required, StringLength(200)] string CustomerName,
    [EmailAddress, StringLength(200)] string? Email,
    [StringLength(50)] string? Phone
);

public record UpdateCustomerRequest(
    [Required, StringLength(200)] string CustomerName,
    [Required, RegularExpression("A|I")] string CustStatus,
    [EmailAddress, StringLength(200)] string? Email,
    [StringLength(50)] string? Phone
);

public record CreateOrderItemRequest(
    [Required] int ProductId,
    [Range(1, int.MaxValue)] int Quantity,
    [Range(0, 1_000_000)] decimal UnitPrice
);

public record CreateOrderRequest(
    [Required] int CustomerId,
    [Required, MinLength(1)] List<CreateOrderItemRequest> Items
);

public record CreatePaymentRequest(
    [Required] int OrderId,
    [Range(0.01, 1_000_000)] decimal Amount
);

public record CreateNotificationRequest(
    int? CustomerId,
    [Required, RegularExpression("EMAIL|SMS")] string Channel,
    [Required, StringLength(1000)] string Message
);

public record CreateProductRequest(
    [Required, StringLength(50)] string Sku,
    [Required, StringLength(200)] string Name,
    [Range(0, int.MaxValue)] int QuantityOnHand,
    [Range(0, 1_000_000)] decimal UnitPrice
);
