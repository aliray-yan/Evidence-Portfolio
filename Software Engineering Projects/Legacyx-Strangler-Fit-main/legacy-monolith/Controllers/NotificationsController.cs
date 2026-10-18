using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public NotificationsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Notification>>> GetAll()
    {
        return await _db.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .AsNoTracking()
            .ToListAsync();
    }

    // Simulated delivery only — logs the notification, contacts no real
    // provider. Bound from a DTO — Notification.Id/CreatedAt were
    // previously client-settable.
    [HttpPost]
    public async Task<ActionResult<Notification>> Send(CreateNotificationRequest request)
    {
        var notification = new Notification
        {
            CustomerId = request.CustomerId,
            Channel = request.Channel,
            Message = request.Message,
            Status = "SIMULATED_SENT"
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), notification);
    }
}
