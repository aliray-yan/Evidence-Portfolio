namespace Gateway.Security;

public record AuditEntry(DateTime Timestamp, string User, string TenantId, string Action, string Domain, string? OldValue, string? NewValue, string Result);

// In-memory and append-only from every caller's perspective — there's no
// endpoint that deletes or edits an entry, only GET (ADMIN-only, scoped
// to the caller's own tenant) and the internal Record() call. "Immutable
// from normal application users" per spec section 20. A real system
// would persist this to a write-once store rather than memory that
// resets on restart — see MANUAL.md.
public class AuditLog
{
    private readonly List<AuditEntry> _entries = new();
    private readonly object _lock = new();

    public void Record(string user, string tenantId, string action, string domain, string? oldValue, string? newValue, string result)
    {
        lock (_lock)
        {
            _entries.Add(new AuditEntry(DateTime.UtcNow, user, tenantId, action, domain, oldValue, newValue, result));
        }
    }

    // ADMINs only ever see their own tenant's history — a retail admin
    // has no business reading aviation audit entries, or vice versa.
    public IReadOnlyList<AuditEntry> Snapshot(string tenantId)
    {
        lock (_lock) { return _entries.Where(e => e.TenantId == tenantId).ToList(); }
    }
}
