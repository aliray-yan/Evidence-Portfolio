using System.Text;
using System.Text.Json.Serialization;
using DotNetMastery.Api.Data;
using DotNetMastery.Api.Middleware;
using DotNetMastery.Api.Seed;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = Environment.GetEnvironmentVariable("DOTNET_MASTERY_CONNECTION")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Database connection string is missing.");

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
var jwtSecret = Environment.GetEnvironmentVariable("DOTNET_MASTERY_JWT_SECRET") ?? jwtOptions.Secret;
if (jwtSecret.Length < 32)
{
    throw new InvalidOperationException("JWT secret must be at least 32 characters.");
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<PasswordHasher>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AchievementService>();
builder.Services.AddScoped<CSharpRunnerService>();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddOpenApi();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors("Client");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = ".NET Mastery", developer = "Ali Rayyan" }));
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Seed");
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrations = db.Database.GetMigrations().ToList();
        if (migrations.Count > 0)
        {
            var canConnect = await db.Database.CanConnectAsync();
            var hasExistingSchema = canConnect && await HasTableAsync(db, "Achievements");
            var hasMigrationHistory = canConnect && await HasTableAsync(db, "__EFMigrationsHistory");
            var appliedMigrations = hasMigrationHistory
                ? (await db.Database.GetAppliedMigrationsAsync()).ToList()
                : [];

            if (hasExistingSchema && appliedMigrations.Count == 0)
            {
                logger.LogWarning("Existing schema detected without EF migration history. Skipping automatic migration and continuing with seed validation.");
            }
            else
            {
                await db.Database.MigrateAsync();
            }
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }

        await CurriculumSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<PasswordHasher>());
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database was not available during startup. Start PostgreSQL and restart the API to create and seed the schema.");
    }
}

app.Run();

static async Task<bool> HasTableAsync(AppDbContext db, string tableName)
{
    await db.Database.OpenConnectionAsync();
    try
    {
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = @tableName
            );
            """;
        var parameter = command.CreateParameter();
        parameter.ParameterName = "tableName";
        parameter.Value = tableName;
        command.Parameters.Add(parameter);
        return await command.ExecuteScalarAsync() is true;
    }
    finally
    {
        await db.Database.CloseConnectionAsync();
    }
}
