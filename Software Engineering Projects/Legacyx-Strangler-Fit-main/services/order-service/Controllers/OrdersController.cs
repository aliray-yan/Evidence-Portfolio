using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Events;
using OrderService.Models;

namespace OrderService.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly OrderDbContext _db;

    // Envelope must serialize camelCase to match docs/architecture/event-architecture.md
    // and both consumers (notification-service, inventory-service) — the default
    // System.Text.Json naming policy would emit PascalCase and silently break both.
    private static readonly JsonSerializerOptions EventJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public OrdersController(OrderDbContext db)
    {
        _db = db;
    }

    // ?customerNo=C001 doubles as "order history" for that customer —
    // no separate history endpoint needed.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetAll([FromQuery] string? customerNo)
    {
        var query = _db.Orders.Include(o => o.Items).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(customerNo))
            query = query.Where(o => o.CustomerNo == customerNo);
        return await query.OrderByDescending(o => o.OrderDate).ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Order>> GetById(int id)
    {
        var order = await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        return order;
    }

    // Bound from a request DTO, not the Order entity directly — the
    // entity's Id/OrderDate/Status were previously client-settable (e.g.
    // creating an order already "SHIPPED", bypassing the normal
    // lifecycle), and OrderItem.OrderId could be pointed at an unrelated
    // existing order.
    [HttpPost]
    public async Task<ActionResult<Order>> Create(CreateOrderRequest request)
    {
        // Deliberately not validated against Customer Service or legacy here —
        // see services/order-service/README.md for why, and the real fix.

        var order = new Order
        {
            CustomerNo = request.CustomerNo,
            OrderNo = $"O{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            Items = request.Items.Select(i => new OrderItem
            {
                Sku = i.Sku,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };
        order.TotalAmount = order.Items.Sum(i => i.Quantity * i.UnitPrice);

        // Outbox pattern: the OrderCreated event is written in the same
        // transaction as the order itself, so the two can never drift —
        // see docs/architecture/event-architecture.md.
        await using var transaction = await _db.Database.BeginTransactionAsync();

        _db.Orders.Add(order);
        await _db.SaveChangesAsync(); // populates order.Id for the event payload

        var eventData = new
        {
            orderId = order.Id,
            orderNo = order.OrderNo,
            customerNo = order.CustomerNo,
            totalAmount = order.TotalAmount,
            items = order.Items.Select(i => new { i.Sku, i.Quantity, i.UnitPrice })
        };
        var envelope = new EventEnvelope(
            EventId: Guid.NewGuid().ToString(),
            EventType: "OrderCreated",
            Timestamp: DateTime.UtcNow,
            CorrelationId: Guid.NewGuid().ToString(),
            Source: "order-service",
            Version: 1,
            Data: eventData
        );

        _db.OutboxMessages.Add(new OutboxMessage
        {
            EventType = "OrderCreated",
            Payload = JsonSerializer.Serialize(envelope, EventJsonOptions)
        });
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    private static readonly string[] ValidStatuses = { "PENDING", "CONFIRMED", "SHIPPED", "CANCELLED" };

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
    {
        if (!ValidStatuses.Contains(status))
            return BadRequest($"Status must be one of: {string.Join(", ", ValidStatuses)}.");

        var order = await _db.Orders.FindAsync(id);
        if (order is null) return NotFound();

        order.Status = status;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order is null) return NotFound();
        if (order.Status == "SHIPPED") return Conflict("Cannot cancel a shipped order.");

        order.Status = "CANCELLED";
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
