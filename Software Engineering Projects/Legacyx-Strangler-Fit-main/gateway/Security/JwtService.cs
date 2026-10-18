using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Gateway.Security;

public record JwtPrincipal(string Subject, string Role, string TenantId);

// Hand-rolled HS256 JWT — same "keep the gateway dependency-free and
// testable" reasoning as routing, resilience, and metrics. JWT's format
// is precisely specified (header.payload.signature, HMAC-SHA256), which
// is why this is a reasonable thing to hand-roll rather than, say,
// hand-rolling TLS would be. Constant-time signature comparison via
// CryptographicOperations.FixedTimeEquals to avoid timing attacks.
public class JwtService
{
    private readonly byte[] _secret;

    public JwtService(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException(
                "JWT secret is empty — set Auth__JwtSecret (env var) or appsettings Auth:JwtSecret. " +
                "No default is provided on purpose; see MANUAL.md.");
        _secret = Encoding.UTF8.GetBytes(secret);
    }

    public string IssueToken(string subject, string role, string tenantId, TimeSpan lifetime)
    {
        var header = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new { alg = "HS256", typ = "JWT" }));
        var payload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new
        {
            sub = subject,
            role,
            tenant_id = tenantId,
            iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            exp = DateTimeOffset.UtcNow.Add(lifetime).ToUnixTimeSeconds()
        }));

        var signature = Sign($"{header}.{payload}");
        return $"{header}.{payload}.{signature}";
    }

    public JwtPrincipal? Validate(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 3) return null;

        var expectedSignature = Sign($"{parts[0]}.{parts[1]}");
        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        var actualBytes = Encoding.UTF8.GetBytes(parts[2]);

        if (expectedBytes.Length != actualBytes.Length) return null;
        if (!CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes)) return null;

        JsonElement payloadJson;
        try
        {
            payloadJson = JsonSerializer.Deserialize<JsonElement>(Base64UrlDecode(parts[1]));
        }
        catch (JsonException)
        {
            return null;
        }

        if (!payloadJson.TryGetProperty("exp", out var expProp)) return null;
        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expProp.GetInt64()) return null; // expired

        var subject = payloadJson.TryGetProperty("sub", out var subProp) ? subProp.GetString() : null;
        var role = payloadJson.TryGetProperty("role", out var roleProp) ? roleProp.GetString() : null;
        var tenantId = payloadJson.TryGetProperty("tenant_id", out var tenantProp) ? tenantProp.GetString() : null;
        if (subject is null || role is null || tenantId is null) return null;

        return new JwtPrincipal(subject, role, tenantId);
    }

    private string Sign(string data)
    {
        using var hmac = new HMACSHA256(_secret);
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(data)));
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        padded += (padded.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
        return Convert.FromBase64String(padded);
    }
}
