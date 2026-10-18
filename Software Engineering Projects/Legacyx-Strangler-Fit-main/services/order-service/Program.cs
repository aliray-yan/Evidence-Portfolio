using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Events;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("OrderDb")));

builder.Services.AddHostedService<OutboxPublisher>();

var app = builder.Build();

// Applies pending migrations on startup so `docker compose up` alone
// provisions the schema — no separate `dotnet ef database update` step.
// Guarded by IsRelational() so this stays safe if a WebApplicationFactory-
// based test ever swaps in EF Core's InMemory provider here too (see
// legacy-monolith/Tests/CustomersControllerTests.cs for why that matters
// — Migrate() is a relational-only operation).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
    if (db.Database.IsRelational())
        db.Database.Migrate();
}

// Explicit regardless of ASPNETCORE_ENVIRONMENT — without this, an
// unhandled exception falls through to the framework default, which is a
// bare empty 500 in Production but a full stack trace if Development is
// ever set anywhere in the deployment pipeline. Real detail only goes to
// server logs.
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

// Logs the correlation ID the gateway generated (or the caller supplied),
// so a request can be traced end to end across both services by grepping
// logs for the same ID — see docs/architecture/observability.md.
app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers.TryGetValue("X-Correlation-Id", out var cid) && !string.IsNullOrWhiteSpace(cid)
        ? cid.ToString()
        : Guid.NewGuid().ToString();
    context.Response.Headers["X-Correlation-Id"] = correlationId;

    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    await next();
    logger.LogInformation(
        "trace correlationId={CorrelationId} service=order-service method={Method} path={Path} status={Status}",
        correlationId, context.Request.Method, context.Request.Path, context.Response.StatusCode);
});

app.UseHttpMetrics(); // prometheus-net: request count/duration histograms, no manual instrumentation needed
app.MapMetrics();     // GET /metrics

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "order-service" }));

app.Run();
