using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public OrdersController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetAll()
    {
        return await _db.Orders.Include(o => o.Items).AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Order>> GetById(int id)
    {
        var order = await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        return order;
    }

    private static readonly string[] ValidStatuses = { "PENDING", "CONFIRMED", "SHIPPED", "CANCELLED" };

    // Bound from a request DTO — the Order entity's Id/OrderDate/Status
    // were previously client-settable, letting a caller create an order
    // that's already "SHIPPED" and bypass the normal lifecycle, or point
    // an OrderItem.OrderId at an unrelated existing order.
    [HttpPost]
    public async Task<ActionResult<Order>> Create(CreateOrderRequest request)
    {
        var customerExists = await _db.Customers.AnyAsync(c => c.Id == request.CustomerId);
        if (!customerExists) return BadRequest("Unknown CustomerId.");

        var order = new Order
        {
            CustomerId = request.CustomerId,
            OrderNo = $"O{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };
        order.TotalAmount = order.Items.Sum(i => i.Quantity * i.UnitPrice);

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

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
