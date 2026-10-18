using System.Text.Json;
using System.Text.Json.Serialization;

namespace LegacyMonolith.Services;

// Serializes a DateTime as an ISO-8601 full-date ("1990-01-01"), not a
// full timestamp.
//
// Only used for Passenger.DateOfBirth, and only because
// passenger-service's Passenger.java declares that field as a
// java.time.LocalDate — Jackson writes it as "1990-01-01", while a bare
// C# DateTime writes "1990-01-01T00:00:00Z". That one extra "T00:00:00Z"
// would be a visible tell of which side of the `passengers` toggle
// answered a request, so it's worth eleven lines to remove.
//
// The column itself stays `timestamp with time zone` — this is purely
// about the wire format, so no migration of the seeded aviation schema is
// needed. The matching DTO parameter is declared DateOnly?, which
// System.Text.Json parses strictly as yyyy-MM-dd and rejects a full
// timestamp for, exactly as Jackson's LocalDate deserializer does. So the
// two sides agree on input as well as output.
public class IsoDateConverter : JsonConverter<DateTime>
{
    private const string Format = "yyyy-MM-dd";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var raw = reader.GetString();
        if (!DateOnly.TryParseExact(raw, Format, out var date))
            throw new JsonException($"Expected a date in {Format} format.");
        return DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString(Format));
}
