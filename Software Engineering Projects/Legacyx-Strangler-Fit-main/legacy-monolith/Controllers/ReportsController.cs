using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;

namespace LegacyMonolith.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public ReportsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        return Ok(new
        {
            totalCustomers = await _db.Customers.CountAsync(),
            totalOrders = await _db.Orders.CountAsync(),
            totalRevenue = await _db.Orders.SumAsync(o => (decimal?)o.TotalAmount) ?? 0,
            productsLowStock = await _db.Products.CountAsync(p => p.QuantityOnHand - p.QuantityReserved < 10)
        });
    }
}
