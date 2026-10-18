using DotNetMastery.Api.Models;

namespace DotNetMastery.Api.DTOs;

public record RegisterRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, UserProfileDto User);
public record UserProfileDto(Guid Id, string Name, string Email, string Role, DateTime CreatedAt);

public static class UserMappings
{
    public static UserProfileDto ToProfile(this User user) =>
        new(user.Id, user.Name, user.Email, user.Role, user.CreatedAt);
}
