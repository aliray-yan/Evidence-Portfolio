namespace OrderService.Models;

// CustomerNo (not a numeric CustomerId) is deliberate: it's the one
// identifier that stays valid whether the customer currently lives in
// legacy_db or customer_db. See docs/architecture/overview.md and
// services/order-service/README.md.
public class Order
{
    public int Id { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string CustomerNo { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "PENDING";   // PENDING, CONFIRMED, SHIPPED, CANCELLED
    public decimal TotalAmount { get; set; }
    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string Sku { get; set; } = string.Empty;   // same reasoning as CustomerNo — Inventory isn't extracted yet
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
