using System.ComponentModel.DataAnnotations;

namespace OrderService.Models;

// The Order entity used to be bound directly from the request body,
// letting a client set Id/OrderDate/Status at creation (e.g. create an
// order already "SHIPPED", bypassing the normal lifecycle) or point an
// OrderItem.OrderId at an unrelated existing order. This DTO only exposes
// what a caller should actually control.
//
// Attributes go directly on the record's constructor parameters, NOT
// `[property: ...]` — ASP.NET Core's model validation for record primary
// constructors throws InvalidOperationException at request time otherwise
// ("has validation metadata defined on property 'X' that will be
// ignored"). Found by actually exercising these endpoints, not inspection.

public record CreateOrderItemRequest(
    [Required, StringLength(50)] string Sku,
    [Range(1, int.MaxValue)] int Quantity,
    [Range(0, 1_000_000)] decimal UnitPrice
);

public record CreateOrderRequest(
    [Required, StringLength(50)] string CustomerNo,
    [Required, MinLength(1)] List<CreateOrderItemRequest> Items
);
