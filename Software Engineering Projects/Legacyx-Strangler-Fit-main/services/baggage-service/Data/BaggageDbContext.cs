using Microsoft.EntityFrameworkCore;
using BaggageService.Models;

namespace BaggageService.Data;

public class BaggageDbContext : DbContext
{
    public BaggageDbContext(DbContextOptions<BaggageDbContext> options) : base(options) { }

    public DbSet<BaggageItem> BaggageItems => Set<BaggageItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Explicit key — EF Core's convention only auto-detects "Id" or
        // "BaggageItemId"; TagId (the spec's actual field name) matches
        // neither, so this fails at migration/startup time without it.
        modelBuilder.Entity<BaggageItem>().HasKey(b => b.TagId);
        modelBuilder.Entity<BaggageItem>().Property(b => b.WeightKg).HasPrecision(6, 2);
        modelBuilder.Entity<BaggageItem>().HasIndex(b => b.FlightId);
    }
}
