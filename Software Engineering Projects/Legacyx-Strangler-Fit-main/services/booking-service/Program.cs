using Microsoft.EntityFrameworkCore;
using BookingService.Data;
using BookingService.Events;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BookingDb")));

builder.Services.AddHostedService<OutboxPublisher>();

var app = builder.Build();

// Guarded by IsRelational() — Migrate() is a relational-only operation
// that throws if a test host ever swaps in EF's InMemory provider (see
// legacy-monolith/Program.cs for the incident that taught this).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    if (db.Database.IsRelational())
        db.Database.Migrate();
}

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

app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers.TryGetValue("X-Correlation-Id", out var cid) && !string.IsNullOrWhiteSpace(cid)
        ? cid.ToString()
        : Guid.NewGuid().ToString();
    context.Response.Headers["X-Correlation-Id"] = correlationId;

    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    await next();
    logger.LogInformation(
        "trace correlationId={CorrelationId} service=booking-service method={Method} path={Path} status={Status}",
        correlationId, context.Request.Method, context.Request.Path, context.Response.StatusCode);
});

app.UseHttpMetrics();
app.MapMetrics();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "booking-service" }));

app.Run();
