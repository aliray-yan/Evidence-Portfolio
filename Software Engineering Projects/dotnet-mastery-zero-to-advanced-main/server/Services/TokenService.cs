using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DotNetMastery.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace DotNetMastery.Api.Services;

public class JwtOptions
{
    public string Issuer { get; set; } = "DotNetMastery";
    public string Audience { get; set; } = "DotNetMasteryClient";
    public string Secret { get; set; } = "local-development-secret-change-me-dotnet-mastery-minimum-32-bytes";
    public int ExpiresMinutes { get; set; } = 720;
}

public class TokenService(IConfiguration configuration)
{
    public string CreateToken(User user)
    {
        var jwt = configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(jwt.ExpiresMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
