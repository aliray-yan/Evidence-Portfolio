using DotNetMastery.Api.Data;
using DotNetMastery.Api.DTOs;
using DotNetMastery.Api.Models;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, PasswordHasher passwordHasher, TokenService tokenService, AchievementService achievements) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || request.Password.Length < 8)
        {
            return BadRequest(new { error = "Name, valid email, and a password of at least 8 characters are required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email))
        {
            return Conflict(new { error = "An account with this email already exists." });
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            Role = Roles.Student,
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        await achievements.UnlockByConditionAsync(user.Id, "login_once");

        return Ok(new AuthResponse(tokenService.CreateToken(user), user.ToProfile()));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { error = "Invalid email or password." });
        }

        await achievements.UnlockByConditionAsync(user.Id, "login_once");
        return Ok(new AuthResponse(tokenService.CreateToken(user), user.ToProfile()));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> Me()
    {
        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        return user is null ? Unauthorized() : Ok(user.ToProfile());
    }
}
