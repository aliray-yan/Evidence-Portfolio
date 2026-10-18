using Microsoft.EntityFrameworkCore;
using BookingService.Models;

namespace BookingService.Data;

public class BookingDbContext : DbContext
{
    public BookingDbContext(DbContextOptions<BookingDbContext> options) : base(options) { }

    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Explicit even though both happen to match EF's naming
        // convention already (Booking -> BookingId, Ticket -> TicketId)
        // — not leaving that to chance after baggage-service and
        // legacy-monolith's aviation tables didn't.
        modelBuilder.Entity<Booking>().HasKey(b => b.BookingId);
        modelBuilder.Entity<Ticket>().HasKey(t => t.TicketId);
        modelBuilder.Entity<Ticket>().HasIndex(t => t.BookingId);
        modelBuilder.Entity<Ticket>().Property(t => t.PricePaid).HasPrecision(10, 2);
    }
}
