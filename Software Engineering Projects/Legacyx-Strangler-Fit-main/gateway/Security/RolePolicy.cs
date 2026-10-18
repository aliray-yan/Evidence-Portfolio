using Gateway.Routing;

namespace Gateway.Security;

// Which roles may perform one action, per tenant.
//
// Before aviation had a cutover authority of its own, every admin endpoint
// in Program.cs hardcoded "retail" plus a literal role list, and the audit
// log had an inline `TenantId == "aviation" ? ... : ...` ternary. Adding a
// second tenant's admin roles that way would have meant a second ternary in
// five places, so the per-tenant role sets are declared once here and the
// endpoints just name the action.
//
// An empty array means "no role in that tenant may do this" — that is a
// deny, not a skip.
public record RolePolicy(string[] Retail, string[] Aviation)
{
    public string[] For(string tenant) => tenant switch
    {
        DomainRegistry.RetailTenant => Retail,
        DomainRegistry.AviationTenant => Aviation,
        _ => Array.Empty<string>()
    };
}

public static class Policies
{
    // Read the routing table. Deliberately wider than ChangeRouting: an
    // operator needs to see which side of the toggle is live to interpret
    // what they're looking at, without being able to move it.
    public static readonly RolePolicy ViewRouting = new(
        Retail: new[] { "ADMIN", "MIGRATION_ENGINEER", "OPERATOR" },
        Aviation: new[]
        {
            "AVIATION_ADMIN", "AVIATION_MIGRATION_ENGINEER",
            // The three operational roles keep everything they could already
            // do and gain read-only routing visibility. They can't cut over.
            "FlightDispatcher", "FleetManager", "GateAgent"
        });

    // Perform a cutover or a rollback. This is the dangerous one.
    public static readonly RolePolicy ChangeRouting = new(
        Retail: new[] { "ADMIN", "MIGRATION_ENGINEER" },
        Aviation: new[] { "AVIATION_ADMIN", "AVIATION_MIGRATION_ENGINEER" });

    // Same audience as ViewRouting: breaker state is the other half of
    // "is it safe to cut over right now", and it's read-only either way.
    public static readonly RolePolicy ViewBreakers = new(
        Retail: new[] { "ADMIN", "MIGRATION_ENGINEER", "OPERATOR" },
        Aviation: new[]
        {
            "AVIATION_ADMIN", "AVIATION_MIGRATION_ENGINEER",
            "FlightDispatcher", "FleetManager", "GateAgent"
        });

    // The audit log records who authenticated, who was denied and who moved
    // a domain — admin-only on both sides. Aviation's was briefly visible to
    // all three operational roles, but only because no aviation admin role
    // existed to give it to; now one does.
    public static readonly RolePolicy ViewAuditLog = new(
        Retail: new[] { "ADMIN" },
        Aviation: new[] { "AVIATION_ADMIN" });

    // Operational, not platform: recording a departure is a dispatcher's
    // job. AVIATION_ADMIN is included because it's the break-glass role.
    public static readonly RolePolicy DispatchFlight = new(
        Retail: Array.Empty<string>(),
        Aviation: new[] { "FlightDispatcher", "AVIATION_ADMIN" });
}
