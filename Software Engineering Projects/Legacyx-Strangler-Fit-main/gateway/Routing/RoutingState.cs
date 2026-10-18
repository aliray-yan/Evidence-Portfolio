namespace Gateway.Routing;

// In-memory routing table: domain -> "legacy" | "modern".
// Resets on restart — fine for v1, see docs/roadmap.md for what a
// persisted version would need.
public class RoutingState
{
    private readonly Dictionary<string, string> _routes;
    private readonly object _lock = new();

    public RoutingState()
    {
        // Seeded from DomainRegistry rather than a literal, so all fourteen
        // domains (three retail, eleven aviation) are present the moment
        // the gateway starts and none can be missed when one is added.
        //
        // Every domain starts on "legacy" — including aviation's, which
        // used to be pinned to "modern" because no legacy aviation API
        // existed. It does now (legacy-monolith/Controllers/Aviation), so
        // aviation starts where retail does: on the monolith, with the
        // cutover still to be performed. That's what makes the toggle
        // demonstrate anything.
        _routes = DomainRegistry.All.ToDictionary(d => d.Name, _ => "legacy");
    }

    public string GetMode(string domain)
    {
        lock (_lock)
        {
            return _routes.TryGetValue(domain, out var mode) ? mode : "legacy";
        }
    }

    public void SetMode(string domain, string mode)
    {
        if (mode is not ("legacy" or "modern"))
            throw new ArgumentException("mode must be 'legacy' or 'modern'.");
        // Rejects an unknown domain instead of silently adding a row that
        // nothing routes by — before the table was seeded in full, a typo'd
        // domain would happily persist and read back as though it meant
        // something.
        if (!DomainRegistry.Exists(domain))
            throw new ArgumentException($"unknown domain '{domain}'.");

        lock (_lock)
        {
            _routes[domain] = mode;
        }
    }

    // Tenant-scoped: a retail admin's routing view must not enumerate
    // aviation's domains, and vice versa. The parameterless overload is
    // kept for internal callers that legitimately need the whole table.
    public IReadOnlyDictionary<string, string> Snapshot(string tenant)
    {
        lock (_lock)
        {
            return DomainRegistry.NamesFor(tenant)
                .Where(_routes.ContainsKey)
                .ToDictionary(name => name, name => _routes[name]);
        }
    }

    public IReadOnlyDictionary<string, string> Snapshot()
    {
        lock (_lock)
        {
            return new Dictionary<string, string>(_routes);
        }
    }
}
