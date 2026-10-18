using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public CustomersController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Customer>>> GetAll()
    {
        return await _db.Customers.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Customer>> GetById(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer is null) return NotFound();
        return customer;
    }

    // Bound from a request DTO, not the Customer entity directly — the
    // entity's Id/CreatedAt were previously client-settable (a client
    // could forge a creation timestamp or collide an Id).
    [HttpPost]
    public async Task<ActionResult<Customer>> Create(CreateCustomerRequest request)
    {
        var customer = new Customer
        {
            CustomerNo = request.CustomerNo,
            CustomerName = request.CustomerName,
            Email = request.Email,
            Phone = request.Phone
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateCustomerRequest updated)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer is null) return NotFound();

        customer.CustomerName = updated.CustomerName;
        customer.CustStatus = updated.CustStatus;
        customer.Email = updated.Email;
        customer.Phone = updated.Phone;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer is null) return NotFound();

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
