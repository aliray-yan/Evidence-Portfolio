using System.Security.Cryptography;
using System.Text;

namespace LegacyMonolith.Services;

// Byte-for-byte the same construction as services/passenger-service's
// PassengerController.hash(): SHA-256 over (rawPassportNumber + pepper),
// Base64-encoded. It has to be identical, not merely equivalent — once
// the `passengers` domain can be toggled between this monolith and the
// extracted service, a hash written by one side has to still verify
// against the other.
//
// Constructor throws on a missing pepper rather than falling back to a
// default, same reasoning as the gateway's JwtService: a leaked database
// of hashes is only useless to an attacker if the pepper isn't guessable.
public class PassportHasher
{
    private readonly string _pepper;

    public PassportHasher(IConfiguration config)
    {
        var pepper = config["Security:PassportPepper"];
        if (string.IsNullOrWhiteSpace(pepper))
            throw new InvalidOperationException(
                "Passport hash pepper is empty — set Security__PassportPepper (env var) or " +
                "appsettings Security:PassportPepper. No default is provided on purpose; " +
                "see .env.example.");
        _pepper = pepper;
    }

    public string Hash(string rawPassportNumber) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawPassportNumber + _pepper)));
}
