namespace LegacyMonolith.Services;

// Every aviation timestamp column is `timestamp with time zone`, and
// Npgsql 6+ refuses to write a DateTime whose Kind isn't Utc to one — it
// throws instead of guessing an offset. A body like
// {"scheduledDeparture":"2026-09-01T10:00:00"} binds to Kind=Unspecified,
// so incoming values get normalised here rather than at each of the four
// aviation endpoints that accept a timestamp.
public static class UtcTime
{
    public static DateTime Normalize(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        // Unspecified: the caller sent no offset. Treated as already-UTC
        // rather than as this container's local time, because that's what
        // the extracted services do with the identical body — Jackson
        // parses a bare ISO-8601 timestamp into an Instant as UTC. The
        // two sides of a toggled domain have to agree on this.
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}
