using Microsoft.EntityFrameworkCore;
using BaggageService.Data;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<BaggageDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BaggageDb")));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BaggageDbContext>();
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
        "trace correlationId={CorrelationId} service=baggage-service method={Method} path={Path} status={Status}",
        correlationId, context.Request.Method, context.Request.Path, context.Response.StatusCode);
});

app.UseHttpMetrics();
app.MapMetrics();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "baggage-service" }));

app.Run();
