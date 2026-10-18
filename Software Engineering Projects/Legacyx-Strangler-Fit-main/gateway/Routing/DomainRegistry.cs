namespace Gateway.Routing;

// One domain the gateway knows how to route: its name (the key used in the
// routing table, the audit log and Prometheus labels), the tenant that
// owns it, and the URL prefix that identifies it.
public record DomainDefinition(string Name, string Tenant, string PathPrefix);

// The single source of truth for what domains exist and who owns them.
//
// This used to be spread across three places in Program.cs — a 14-branch
// if-chain in ResolveDomain, a hardcoded "customer or order or inventory
// -> retail, everything else -> aviation" in ResolveTenant, and a
// three-entry seed dictionary in RoutingState. Adding aviation's toggle
// meant all three had to agree about all fourteen domains, so they're one
// list now. It lives in its own file rather than in Program.cs because C#
// top-level statements can't declare static readonly fields.
public static class DomainRegistry
{
    public const string RetailTenant = "retail";
    public const string AviationTenant = "aviation";

    // Order matters only in that ResolveDomain returns the first match;
    // no prefix here is a segment-prefix of another, so any order works.
    public static readonly IReadOnlyList<DomainDefinition> All = new[]
    {
        new DomainDefinition("customer", RetailTenant, "/api/customers"),
        new DomainDefinition("order", RetailTenant, "/api/orders"),
        new DomainDefinition("inventory", RetailTenant, "/api/inventory"),

        new DomainDefinition("passengers", AviationTenant, "/api/aviation/passengers"),
        new DomainDefinition("loyalty", AviationTenant, "/api/aviation/loyalty"),
        new DomainDefinition("aircraft", AviationTenant, "/api/aviation/aircraft"),
        new DomainDefinition("maintenance", AviationTenant, "/api/aviation/maintenance"),
        new DomainDefinition("routes", AviationTenant, "/api/aviation/routes"),
        new DomainDefinition("flights", AviationTenant, "/api/aviation/flights"),
        new DomainDefinition("bookings", AviationTenant, "/api/aviation/bookings"),
        new DomainDefinition("tickets", AviationTenant, "/api/aviation/tickets"),
        new DomainDefinition("crew", AviationTenant, "/api/aviation/crew"),
        new DomainDefinition("assignments", AviationTenant, "/api/aviation/assignments"),
        new DomainDefinition("baggage", AviationTenant, "/api/aviation/baggage")
    };

    private static readonly Dictionary<string, DomainDefinition> ByName =
        All.ToDictionary(d => d.Name, StringComparer.OrdinalIgnoreCase);

    // "unrouted": a path that matches no domain. Still forwarded to the
    // legacy monolith (it's the catch-all's fallback for the monolith's
    // non-extracted domains — payments, notifications, /health, /swagger),
    // but it has no routing-table entry and belongs to no tenant.
    public const string Unrouted = "unrouted";

    public static string ResolveDomain(PathString path)
    {
        foreach (var domain in All)
            if (path.StartsWithSegments(domain.PathPrefix, StringComparison.OrdinalIgnoreCase))
                return domain.Name;
        return Unrouted;
    }

    // Null for an unknown or unrouted domain — callers use that to mean
    // "no tenant owns this, so there's nothing to cross-tenant check".
    public static string? TenantOf(string domain) =>
        ByName.TryGetValue(domain, out var definition) ? definition.Tenant : null;

    public static bool Exists(string domain) => ByName.ContainsKey(domain);

    public static IEnumerable<string> NamesFor(string tenant) =>
        All.Where(d => d.Tenant == tenant).Select(d => d.Name);

    // Backend keys. These name the configuration entry a request is
    // forwarded to and double as the circuit-breaker key, so they're built
    // in one place rather than interpolated at each use site.
    public const string LegacyBackendKey = "legacy";
    public const string ModernBackendPrefix = "modern:";

    public static string ModernBackendKey(string domain) => ModernBackendPrefix + domain;

    // Which tenant's admin may see a given backend's circuit breaker.
    //
    // This closes the gap MANUAL.md called out: /admin/circuit-breakers
    // returned the whole registry, so a retail admin could read off every
    // aviation backend name the platform had ever called. The registry is
    // still one flat set of breakers — deliberately, because the legacy
    // monolith serves both tenants and a per-tenant breaker would let
    // aviation traffic keep hammering a backend retail traffic had already
    // tripped — but the view over it is now scoped.
    //
    // The tenant is derived from the key itself rather than from which
    // tenants have been observed using it, so the answer is the same on a
    // cold start as it is after a day of traffic.
    public static bool BackendVisibleTo(string backendKey, string tenant)
    {
        // The shared monolith. Both tenants route to it, both see it, and
        // its name gives nothing away about the other tenant's domains.
        if (backendKey == LegacyBackendKey)
            return tenant is RetailTenant or AviationTenant;

        if (backendKey.StartsWith(ModernBackendPrefix, StringComparison.Ordinal))
            return TenantOf(backendKey[ModernBackendPrefix.Length..]) == tenant;

        // An unrecognised key is hidden from everyone rather than shown to
        // everyone: a breaker whose owner we can't establish is exactly the
        // case where leaking the name would be the bug.
        return false;
    }
}
