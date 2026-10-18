using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers;

[ApiController]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public InventoryController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll()
    {
        return await _db.Products.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();
        return product;
    }

    // Bound from a DTO — Product.Id/QuantityReserved were previously
    // client-settable, letting a caller create stock already "reserved"
    // out of thin air.
    [HttpPost]
    public async Task<ActionResult<Product>> Create(CreateProductRequest request)
    {
        var product = new Product
        {
            Sku = request.Sku,
            Name = request.Name,
            QuantityOnHand = request.QuantityOnHand,
            QuantityReserved = 0,
            UnitPrice = request.UnitPrice
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPost("{id:int}/reserve")]
    public async Task<IActionResult> Reserve(int id, [FromBody] int quantity)
    {
        // A non-positive quantity here previously passed the "> available"
        // check for free (negative is never greater than available) and
        // then *decreased* QuantityReserved via +=, i.e. reserve doubled
        // as an uncontrolled release.
        if (quantity <= 0) return BadRequest("Quantity must be positive.");

        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        var available = product.QuantityOnHand - product.QuantityReserved;
        if (quantity > available) return Conflict($"Only {available} units available.");

        product.QuantityReserved += quantity;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/release")]
    public async Task<IActionResult> Release(int id, [FromBody] int quantity)
    {
        // Same issue in reverse: a non-positive quantity would increase
        // QuantityReserved past QuantityOnHand instead of releasing stock.
        if (quantity <= 0) return BadRequest("Quantity must be positive.");

        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.QuantityReserved = Math.Max(0, product.QuantityReserved - quantity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
