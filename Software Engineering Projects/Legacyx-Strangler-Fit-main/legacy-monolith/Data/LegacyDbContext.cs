using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Models;

namespace LegacyMonolith.Data;

// One shared context across every domain — this is deliberate. It's the
// "shared database" coupling that makes the monolith a monolith, and the
// exact thing Customer's extraction (services/customer-service) removes
// for that one domain.
public class LegacyDbContext : DbContext
{
    public LegacyDbContext(DbContextOptions<LegacyDbContext> options) : base(options) { }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // Aviation tenant — see Models/Aviation.cs.
    public DbSet<Passenger> Passengers => Set<Passenger>();
    public DbSet<LoyaltyAccount> LoyaltyAccounts => Set<LoyaltyAccount>();
    public DbSet<Aircraft> Aircraft => Set<Aircraft>();
    public DbSet<MaintenanceLog> MaintenanceLogs => Set<MaintenanceLog>();
    public DbSet<FlightRoute> Routes => Set<FlightRoute>();
    public DbSet<Flight> Flights => Set<Flight>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<CrewMember> CrewMembers => Set<CrewMember>();
    public DbSet<FlightAssignment> FlightAssignments => Set<FlightAssignment>();
    public DbSet<BaggageItem> BaggageItems => Set<BaggageItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>().HasIndex(c => c.CustomerNo).IsUnique();
        modelBuilder.Entity<Order>().HasIndex(o => o.OrderNo).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(p => p.Sku).IsUnique();

        modelBuilder.Entity<Order>()
            .HasMany(o => o.Items)
            .WithOne()
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Product>()
            .Property(p => p.UnitPrice).HasPrecision(10, 2);
        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.UnitPrice).HasPrecision(10, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount).HasPrecision(10, 2);
        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount).HasPrecision(10, 2);

        // Aviation: explicit keys for every entity — EF Core's convention
        // only auto-detects "Id" or "{ClassName}Id" (e.g. FlightId on
        // Flight), and most of these field names come straight from the
        // spec's schema (AccountId, TailNumber, CrewId, TagId, ...),
        // which doesn't follow that pattern. Relationships are
        // configured only within a pair that shares one future
        // microservice — see Models/Aviation.cs.
        modelBuilder.Entity<Passenger>().HasKey(p => p.PassengerId);
        modelBuilder.Entity<LoyaltyAccount>().HasKey(l => l.AccountId);
        modelBuilder.Entity<Aircraft>().HasKey(a => a.TailNumber);
        modelBuilder.Entity<MaintenanceLog>().HasKey(m => m.LogId);
        modelBuilder.Entity<FlightRoute>().HasKey(r => r.RouteId);
        modelBuilder.Entity<Flight>().HasKey(f => f.FlightId);
        modelBuilder.Entity<Booking>().HasKey(b => b.BookingId);
        modelBuilder.Entity<Ticket>().HasKey(t => t.TicketId);
        modelBuilder.Entity<CrewMember>().HasKey(c => c.CrewId);
        modelBuilder.Entity<FlightAssignment>().HasKey(a => a.AssignmentId);
        modelBuilder.Entity<BaggageItem>().HasKey(b => b.TagId);

        modelBuilder.Entity<LoyaltyAccount>().HasIndex(l => l.PassengerId).IsUnique();
        modelBuilder.Entity<MaintenanceLog>().HasIndex(m => m.TailNumber);
        modelBuilder.Entity<Flight>().HasIndex(f => f.RouteId);
        modelBuilder.Entity<Ticket>().HasIndex(t => t.BookingId);
        modelBuilder.Entity<FlightAssignment>().HasIndex(a => a.CrewId);

        modelBuilder.Entity<Ticket>().Property(t => t.PricePaid).HasPrecision(10, 2);
        modelBuilder.Entity<FlightAssignment>().Property(a => a.LoggedDutyHours).HasPrecision(6, 2);
        modelBuilder.Entity<BaggageItem>().Property(b => b.WeightKg).HasPrecision(6, 2);
    }
}
