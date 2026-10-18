using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public PaymentsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Payment>> GetById(int id)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment is null) return NotFound();
        return payment;
    }

    [HttpGet("order/{orderId:int}")]
    public async Task<ActionResult<IEnumerable<Payment>>> GetByOrder(int orderId)
    {
        return await _db.Payments.Where(p => p.OrderId == orderId).AsNoTracking().ToListAsync();
    }

    // Simulated only — always "succeeds" and never contacts a real processor.
    // Bound from a DTO — Payment.Id/CreatedAt were previously client-settable.
    [HttpPost]
    public async Task<ActionResult<Payment>> RequestPayment(CreatePaymentRequest request)
    {
        var order = await _db.Orders.FindAsync(request.OrderId);
        if (order is null) return BadRequest("Unknown OrderId.");

        var payment = new Payment
        {
            OrderId = request.OrderId,
            Amount = request.Amount,
            Status = "COMPLETED",
            Method = "SIMULATED"
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = payment.Id }, payment);
    }
}
