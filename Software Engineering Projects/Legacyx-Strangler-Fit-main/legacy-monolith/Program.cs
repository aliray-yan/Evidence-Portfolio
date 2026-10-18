using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using LegacyMonolith.Data;
using LegacyMonolith.Services;

var builder = WebApplication.CreateBuilder(args);

// JsonStringEnumConverter is here for the aviation controllers: the seven
// aviation enums (FlightState, AircraftStatus, BaggageLocation, …) would
// otherwise serialize as integers, while the extracted services emit
// strings ("Airborne", not 2) — Jackson and Pydantic both default to the
// name. A caller must not be able to tell legacy from modern by the shape
// of a status field. Safe for retail, which has no enums at all: every
// retail status (Order.Status, Customer.CustStatus) is a plain string.
//
// allowIntegerValues: false matters on the way in, not out — without it
// {"status": 2} would bind happily here while Jackson and Pydantic both
// reject a number for an enum field, so the two sides would disagree on
// which request bodies earn a 400.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false)));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<LegacyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LegacyDb")));

// Lazily constructed (the ctor reads config and throws if the pepper is
// missing), matching how the gateway registers JwtService. That keeps the
// cost on aviation traffic only: Tests/CustomersControllerTests.cs boots
// this same Program via WebApplicationFactory without any aviation config,
// and eager construction would fail every retail test on a missing
// aviation secret.
builder.Services.AddSingleton<PassportHasher>();

var app = builder.Build();

// Applies pending migrations on startup so `docker compose up` alone
// provisions the schema — no separate `dotnet ef database update` step.
// Guarded by IsRelational(): Tests/CustomersControllerTests.cs swaps in
// EF Core's InMemory provider via WebApplicationFactory, and Migrate() is
// a relational-only operation that throws against it.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LegacyDbContext>();
    if (db.Database.IsRelational())
        db.Database.Migrate();
}

// Explicit regardless of ASPNETCORE_ENVIRONMENT — without this, an
// unhandled exception (e.g. a DB constraint violation) falls through to
// the framework default, which is a bare empty 500 in Production but a
// full stack trace if Development is ever set anywhere in the deployment
// pipeline. This guarantees a generic response either way; real detail
// only goes to server logs.
app.UseExceptionHandler(errApp => errApp.Run(async context =>
{
    var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
    if (feature is not null)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(feature.Error, "Unhandled exception");
    }
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
}));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Logs the correlation ID the gateway generated (or the caller supplied) —
// same pattern as order-service, so a request is traceable across
// whichever backend actually handled it. See docs/architecture/observability.md.
app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers.TryGetValue("X-Correlation-Id", out var cid) && !string.IsNullOrWhiteSpace(cid)
        ? cid.ToString()
        : Guid.NewGuid().ToString();
    context.Response.Headers["X-Correlation-Id"] = correlationId;

    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    await next();
    logger.LogInformation(
        "trace correlationId={CorrelationId} service=legacy-monolith method={Method} path={Path} status={Status}",
        correlationId, context.Request.Method, context.Request.Path, context.Response.StatusCode);
});

app.MapControllers();

// Deliberately simple for v1 — no /ready or /live split yet (see docs/roadmap.md).
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "legacy-monolith" }));

app.Run();

// Top-level statement Program classes are internal by default, which
// WebApplicationFactory<Program> in Tests/CustomersControllerTests.cs
// can't see across the project boundary. This is the standard fix.
public partial class Program { }
