using System.Security.Cryptography;
using System.Text;

namespace Gateway.Security;

public record AppUser(string Username, string PasswordHash, string Salt, string Role, string TenantId);

// Demo-only in-memory user store — no persistence, no self-service
// registration, that's a real gap and MANUAL.md says so. What it does
// do properly: PBKDF2 with a random salt per user, never a plaintext or
// hardcoded password anywhere. Seeded entirely from environment
// variables — if they're not set, that role simply can't log in, rather
// than falling back to a guessable default.
//
// Two tenants, strictly separate role sets. Each has three operational
// roles from its own domain vocabulary plus two platform roles that own
// the cutover: retail's ADMIN/MIGRATION_ENGINEER and aviation's
// AVIATION_ADMIN/AVIATION_MIGRATION_ENGINEER. The aviation pair is
// prefixed rather than reusing retail's names because a role string is
// only ever compared within a tenant — an unprefixed "ADMIN" in two
// tenants would read like one role with two meanings. A username is only
// ever seeded into one tenant.
//
// Who may do what is not decided here — see Security/RolePolicy.cs.
public class UserStore
{
    private readonly Dictionary<string, AppUser> _users = new();

    public UserStore(IConfiguration config)
    {
        Seed(config, "Auth:AdminUsername", "Auth:AdminPassword", "ADMIN", "retail");
        Seed(config, "Auth:MigrationEngineerUsername", "Auth:MigrationEngineerPassword", "MIGRATION_ENGINEER", "retail");
        Seed(config, "Auth:OperatorUsername", "Auth:OperatorPassword", "OPERATOR", "retail");

        Seed(config, "Auth:FlightDispatcherUsername", "Auth:FlightDispatcherPassword", "FlightDispatcher", "aviation");
        Seed(config, "Auth:FleetManagerUsername", "Auth:FleetManagerPassword", "FleetManager", "aviation");
        Seed(config, "Auth:GateAgentUsername", "Auth:GateAgentPassword", "GateAgent", "aviation");

        Seed(config, "Auth:AviationAdminUsername", "Auth:AviationAdminPassword", "AVIATION_ADMIN", "aviation");
        Seed(config, "Auth:AviationMigrationEngineerUsername", "Auth:AviationMigrationEngineerPassword",
            "AVIATION_MIGRATION_ENGINEER", "aviation");
    }

    public int SeededUserCount => _users.Count;

    private void Seed(IConfiguration config, string userKey, string passKey, string role, string tenantId)
    {
        var username = config[userKey];
        var password = config[passKey];
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password)) return;

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        _users[username] = new AppUser(username, Convert.ToBase64String(hash), Convert.ToBase64String(salt), role, tenantId);
    }

    public AppUser? Authenticate(string username, string password)
    {
        if (!_users.TryGetValue(username, out var user)) return null;

        var salt = Convert.FromBase64String(user.Salt);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        var computedB64 = Convert.ToBase64String(hash);

        var expected = Encoding.UTF8.GetBytes(computedB64);
        var actual = Encoding.UTF8.GetBytes(user.PasswordHash);
        if (expected.Length != actual.Length) return null;
        if (!CryptographicOperations.FixedTimeEquals(expected, actual)) return null;

        return user;
    }
}
