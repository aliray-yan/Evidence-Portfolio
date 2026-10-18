using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Gateway.Observability;
using Gateway.Resilience;
using Gateway.Routing;
using Gateway.Security;

var builder = WebApplication.CreateBuilder(args);

// Drops the "Server: Kestrel" response header — cheap fingerprinting reduction.
builder.WebHost.ConfigureKestrel(o => o.AddServerHeader = false);

builder.Services.AddSingleton<RoutingState>();
builder.Services.AddSingleton<CircuitBreakerRegistry>();
builder.Services.AddSingleton<MetricsRegistry>();
builder.Services.AddSingleton<AuditLog>();
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton(sp => new JwtService(sp.GetRequiredService<IConfiguration>()["Auth:JwtSecret"] ?? ""));
builder.Services.AddHttpClient("backend");

// The dashboard (localhost:3001) calls this gateway (localhost:8080) from
// the browser — a different origin, so without CORS the browser blocks
// every request (including the /auth/login preflight) before it's ever
// sent. Never live-tested against a real browser in the sandbox that
// built this, hence the gap. Configurable via Cors:AllowedOrigins for
// non-default setups; comma-separated.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:3001,http://127.0.0.1:3001")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Built into ASP.NET Core since .NET 7 — no NuGet package needed.
// Every policy here is partitioned by client IP: an unpartitioned
// AddFixedWindowLimiter shares ONE counter across every caller, so 5
// garbage requests from any single anonymous client would exhaust the
// login budget for every real admin/migrator/operator at once — a
// self-inflicted denial-of-service. Partitioning keeps the throttle
// scoped to the actual abusive caller.
static string ClientPartitionKey(HttpContext ctx) =>
    ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

builder.Services.AddRateLimiter(options =>
{
    // 5 attempts/minute per IP on login — slows credential-guessing
    // without needing a WAF or external service.
    options.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientPartitionKey(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));

    // The one endpoint the spec calls out as the actual write path for
    // migration state — tighter than general traffic, per IP.
    options.AddPolicy("admin-write", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientPartitionKey(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));

    // Business API traffic (the catch-all) is unauthenticated by design
    // (see docs/architecture/security.md) — a per-IP ceiling stops
    // unrestricted flooding without affecting normal use.
    options.AddPolicy("general", ctx => RateLimitPartition.GetSlidingWindowLimiter(
        ClientPartitionKey(ctx),
        _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 300,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 4,
            QueueLimit = 0
        }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var app = builder.Build();

// Safety net independent of ASPNETCORE_ENVIRONMENT: without this, an
// unhandled exception (e.g. a null-reference from a malformed request)
// falls through to the framework default, which is a bare empty 500 in
// Production but a full stack trace if Development is ever set anywhere
// in the deployment pipeline (e.g. by accident). This guarantees a
// generic response either way, with the real detail only in server logs.
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

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    await next();
});

app.UseCors();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "gateway" }));

app.MapPost("/auth/login", (LoginRequest body, UserStore users, JwtService jwt) =>
{
    // Minimal-API JSON binding doesn't enforce non-nullable record
    // properties at runtime — a body like {"username":null,"password":"x"}
    // passes null straight into UserStore's dictionary lookup and throws.
    if (string.IsNullOrWhiteSpace(body.Username) || string.IsNullOrWhiteSpace(body.Password))
        return Results.Json(new { error = "Invalid username or password." }, statusCode: 401);

    var user = users.Authenticate(body.Username, body.Password);
    if (user is null)
        return Results.Json(new { error = "Invalid username or password." }, statusCode: 401);

    var token = jwt.IssueToken(user.Username, user.Role, user.TenantId, TimeSpan.FromHours(1));
    return Results.Ok(new { token, role = user.Role, tenantId = user.TenantId, expiresInSeconds = 3600 });
}).RequireRateLimiting("login");

// Both tenants have a per-domain legacy/modern toggle now, so this is no
// longer a retail-only concept. The tenant comes from the token rather
// than being hardcoded, and the snapshot is scoped to it: a retail admin
// sees three domains, an aviation admin sees eleven, and neither is told
// the other's exist.
app.MapGet("/admin/routing", (HttpContext context, RoutingState routing, JwtService jwt, AuditLog audit) =>
{
    var auth = Authorize(context, jwt, audit, Policies.ViewRouting);
    if (auth.Status is not null) return auth.Status;
    return Results.Ok(routing.Snapshot(auth.Principal!.TenantId));
});

app.MapPut("/admin/routing/{domain}", (HttpContext context, string domain, RoutingModeRequest body, RoutingState routing, JwtService jwt, AuditLog audit) =>
{
    // The one endpoint the spec explicitly calls out: "migration
    // configuration changes must require an authorized role."
    //
    // Authorization runs before the domain is looked at at all, so an
    // anonymous caller can't use the 404-vs-403 split below to enumerate
    // the routing table.
    var auth = Authorize(context, jwt, audit, Policies.ChangeRouting);
    if (auth.Status is not null) return auth.Status;

    var principal = auth.Principal!;
    var owner = DomainRegistry.TenantOf(domain);
    if (owner is null)
        return Results.NotFound(new { error = $"Unknown domain '{domain}'." });

    // A retail admin must not be able to roll back aviation's flights
    // domain, and vice versa. Audited as a cross-tenant denial rather than
    // a plain insufficient-role 403 — that's the distinction the spec
    // draws. It does let an already-privileged caller tell "exists, owned
    // by the other tenant" from "doesn't exist"; accepted, because giving
    // up the distinct audit event to hide a domain name from someone who
    // already holds cutover rights somewhere is the worse trade.
    if (owner != principal.TenantId)
    {
        audit.Record(principal.Subject, principal.TenantId, "CROSS_TENANT_DENIED", domain, principal.TenantId, owner, "DENIED");
        return Results.Json(new { error = $"Domain '{domain}' belongs to tenant '{owner}', your token belongs to '{principal.TenantId}'." }, statusCode: 403);
    }

    var oldMode = routing.GetMode(domain);
    try
    {
        routing.SetMode(domain, body.Mode);
        audit.Record(principal.Subject, owner, "ROUTING_CHANGED", domain, oldMode, body.Mode, "SUCCESS");
        return Results.Ok(new { domain, mode = body.Mode });
    }
    catch (ArgumentException ex)
    {
        audit.Record(principal.Subject, owner, "ROUTING_CHANGED", domain, oldMode, body.Mode, $"FAILED: {ex.Message}");
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireRateLimiting("admin-write");

// Scoped to the caller's tenant. This used to return the entire registry,
// which meant a retail admin could read off the name of every aviation
// backend the gateway had ever called — MANUAL.md listed it as a known
// gap. The registry stays shared on purpose; DomainRegistry.BackendVisibleTo
// explains why, and decides who sees which key.
app.MapGet("/admin/circuit-breakers", (HttpContext context, CircuitBreakerRegistry breakers, JwtService jwt, AuditLog audit) =>
{
    var auth = Authorize(context, jwt, audit, Policies.ViewBreakers);
    if (auth.Status is not null) return auth.Status;

    var tenant = auth.Principal!.TenantId;
    var visible = breakers.Snapshot()
        .Where(entry => DomainRegistry.BackendVisibleTo(entry.Key, tenant))
        .ToDictionary(entry => entry.Key, entry => entry.Value);
    return Results.Ok(visible);
});

// The one admin endpoint genuinely shared by both tenants: each caller
// sees only their own tenant's history (AuditLog.Snapshot filters by it),
// and on each side only that tenant's admin role may read it. Aviation's
// was briefly open to all three operational roles, but only because there
// was no aviation admin role to give it to.
app.MapGet("/admin/audit-log", (HttpContext context, AuditLog audit, JwtService jwt) =>
{
    var auth = Authorize(context, jwt, audit, Policies.ViewAuditLog);
    if (auth.Status is not null) return auth.Status;
    return Results.Ok(audit.Snapshot(auth.Principal!.TenantId));
});

// Representative aviation *operational* action — dispatch authority over a
// flight's status, audited. Not exhaustive across all eleven aviation
// domains (that would be a lot of near-identical admin surface for a
// demo); this is the one that most clearly needs a gated, audited write
// path of its own rather than going through the unauthenticated catch-all.
app.MapPut("/admin/aviation/flights/{id}/status", async (
    HttpContext context, string id, FlightStatusRequest body,
    IHttpClientFactory httpClientFactory, IConfiguration config, RoutingState routing,
    JwtService jwt, AuditLog audit) =>
{
    const string flightsDomain = "flights";

    var auth = Authorize(context, jwt, audit, Policies.DispatchFlight, DomainRegistry.AviationTenant);
    if (auth.Status is not null) return auth.Status;

    // A minimal-API record binds a missing property to null, and null would
    // otherwise be forwarded and written into the audit row.
    if (string.IsNullOrWhiteSpace(body.Status))
        return Results.BadRequest(new { error = "status is required." });

    // Follows the flights domain's own toggle. This used to read
    // Backends:Aviation:flights unconditionally, which was harmless while
    // the modern service was aviation's only implementation — but now it
    // would record a departure in the modern service while every read went
    // to the monolith, so a dispatcher would file a departure and watch
    // nothing happen.
    var mode = routing.GetMode(flightsDomain);
    var targetBase = mode == "modern" ? config[$"Backends:Modern:{flightsDomain}"] : config["Backends:Legacy"];
    if (string.IsNullOrEmpty(targetBase))
        return Results.Json(new { error = $"No {mode} backend configured for flights." }, statusCode: 503);

    var client = httpClientFactory.CreateClient("backend");
    HttpResponseMessage resp;
    try
    {
        resp = await client.PutAsJsonAsync($"{targetBase}/api/aviation/flights/{id}/status", body, context.RequestAborted);
    }
    catch (HttpRequestException)
    {
        audit.Record(auth.Principal!.Subject, "aviation", "FLIGHT_STATUS_CHANGED", id, null, body.Status, $"FAILED: {mode} backend unreachable");
        return Results.Json(new { error = "Flight backend unreachable." }, statusCode: 502);
    }

    audit.Record(auth.Principal!.Subject, "aviation", "FLIGHT_STATUS_CHANGED", id, null, body.Status,
        resp.IsSuccessStatusCode ? "SUCCESS" : $"FAILED: {(int)resp.StatusCode}");

    // Pass the backend's body through rather than returning a bare status
    // code. It used to return just the code, which meant a caller expecting
    // the updated flight back got an empty 200 and a JSON parse error — the
    // dashboard reported "failed to update" on every successful dispatch.
    // Nothing is leaked by doing this that isn't already reachable: the
    // catch-all proxies this exact route unauthenticated.
    using (resp)
    {
        context.Response.StatusCode = (int)resp.StatusCode;
        var contentType = resp.Content.Headers.ContentType?.ToString();
        if (contentType is not null) context.Response.ContentType = contentType;
        await resp.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
    }
    return Results.Empty;
}).RequireRateLimiting("admin-write");

// Left unauthenticated on purpose: Prometheus's own scrape config would
// need to be taught to send a bearer token otherwise, and the usual
// real-world answer is network-level restriction (internal-only route,
// separate port) rather than app-level auth on a metrics endpoint.
app.MapGet("/metrics", (MetricsRegistry metrics, CircuitBreakerRegistry breakers) =>
    Results.Text(metrics.RenderPrometheusText(breakers), "text/plain; version=0.0.4"));

// Catch-all: forwards to whichever backend the routing table currently
// points at. Business-API traffic itself (customer/order/inventory CRUD)
// is NOT auth-gated here — that's a real, documented scope boundary, not
// an oversight. See docs/architecture/security.md.
app.Map("/{**catchall}", async (
    HttpContext context,
    IHttpClientFactory httpClientFactory,
    RoutingState routing,
    IConfiguration config,
    CircuitBreakerRegistry breakers,
    MetricsRegistry metrics,
    ILogger<Program> logger,
    JwtService jwt,
    AuditLog audit) =>
{
    // Client-supplied — constrained before it's trusted-looking metadata
    // that gets echoed back, written into logs, and forwarded to whichever
    // backend handles the request. An unconstrained value here could be
    // arbitrarily large or contain control/unicode bytes a downstream
    // service logs less safely than this one does.
    var incomingCorrelationId = context.Request.Headers.TryGetValue("X-Correlation-Id", out var incoming) ? incoming.ToString() : null;
    var correlationId = IsValidCorrelationId(incomingCorrelationId)
        ? incomingCorrelationId!
        : Guid.NewGuid().ToString();
    context.Response.Headers["X-Correlation-Id"] = correlationId;

    var domain = DomainRegistry.ResolveDomain(context.Request.Path);
    var tenant = DomainRegistry.TenantOf(domain);

    // Cross-tenant check applies only when the caller actually presents a
    // token — anonymous business traffic keeps flowing exactly as before
    // (that's the existing, documented no-auth-on-business-API boundary).
    // A token that DOES exist but names a different tenant than the
    // resource it's hitting is exactly the "cross-tenant request" the
    // spec requires an immediate 403 for.
    if (tenant is not null && context.Request.Headers.TryGetValue("Authorization", out var authHeader)
        && authHeader.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        var principal = jwt.Validate(authHeader.ToString()["Bearer ".Length..].Trim());
        if (principal is not null && principal.TenantId != tenant)
        {
            audit.Record(principal.Subject, principal.TenantId, "CROSS_TENANT_DENIED", domain, principal.TenantId, tenant, "DENIED");
            logger.LogWarning(
                "security_event=cross_tenant_denied user={User} userTenant={UserTenant} resourceTenant={ResourceTenant} domain={Domain} path={Path}",
                principal.Subject, principal.TenantId, tenant, domain, context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = $"Token belongs to tenant '{principal.TenantId}', this resource belongs to '{tenant}'." });
            return;
        }
    }

    // One rule for all fourteen domains now. Aviation used to be forced to
    // "modern" here because it had no legacy implementation to fall back
    // to; it has one, so it reads its mode from the table like retail does.
    // "unrouted" (the monolith's non-extracted domains, /health, /swagger)
    // has no table entry and always goes to the monolith.
    var mode = domain == DomainRegistry.Unrouted ? "legacy" : routing.GetMode(domain);
    var stopwatch = Stopwatch.StartNew();

    void RecordAndLog(int status)
    {
        stopwatch.Stop();
        metrics.RecordRequest(domain, mode, status, stopwatch.Elapsed.TotalMilliseconds);
        logger.LogInformation(
            "trace correlationId={CorrelationId} domain={Domain} tenant={Tenant} mode={Mode} method={Method} path={Path} status={Status} durationMs={DurationMs}",
            correlationId, domain, tenant ?? "none", mode, context.Request.Method, context.Request.Path, status, stopwatch.Elapsed.TotalMilliseconds);
    }

    // Backends:Legacy is the shared monolith — it serves retail's three
    // domains and aviation's eleven, so the legacy side needs no per-tenant
    // configuration at all. Only the modern side is per-domain.
    var useModern = mode == "modern" && domain != DomainRegistry.Unrouted;
    var backendKey = useModern ? DomainRegistry.ModernBackendKey(domain) : DomainRegistry.LegacyBackendKey;
    var targetBase = useModern ? config[$"Backends:Modern:{domain}"] : config["Backends:Legacy"];

    if (string.IsNullOrEmpty(targetBase))
    {
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await context.Response.WriteAsJsonAsync(new { error = "No backend configured for this route.", domain, mode, correlationId });
        RecordAndLog(503);
        return;
    }

    var breaker = breakers.GetOrCreate(backendKey);
    if (!breaker.AllowRequest())
    {
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.Headers["X-Circuit-Breaker"] = "open";
        await context.Response.WriteAsJsonAsync(new
        {
            error = $"Circuit breaker open for '{backendKey}' — failing fast instead of waiting on a known-down backend.",
            domain,
            mode,
            correlationId
        });
        RecordAndLog(503);
        return;
    }

    byte[]? bodyBytes = null;
    if (context.Request.ContentLength is > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding"))
    {
        using var ms = new MemoryStream();
        await context.Request.Body.CopyToAsync(ms);
        bodyBytes = ms.ToArray();
    }

    var isIdempotent = context.Request.Method is "GET" or "HEAD" or "OPTIONS" or "PUT" or "DELETE";
    var maxAttempts = isIdempotent ? 3 : 1;
    var timeout = TimeSpan.FromSeconds(5);

    var client = httpClientFactory.CreateClient("backend");
    var targetUri = new Uri(new Uri(targetBase), context.Request.Path + context.Request.QueryString);

    HttpResponseMessage? backendResponse = null;
    Exception? lastException = null;

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        var forwardRequest = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUri);
        // Safe to add with normal validation now that correlationId is
        // constrained by IsValidCorrelationId above.
        forwardRequest.Headers.Add("X-Correlation-Id", correlationId);
        if (bodyBytes is not null)
        {
            forwardRequest.Content = new ByteArrayContent(bodyBytes);
            if (context.Request.ContentType is not null)
                forwardRequest.Content.Headers.TryAddWithoutValidation("Content-Type", context.Request.ContentType);
        }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        cts.CancelAfter(timeout);

        try
        {
            backendResponse = await client.SendAsync(forwardRequest, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            lastException = null;
            break;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            lastException = ex;
            backendResponse?.Dispose();
            backendResponse = null;

            if (attempt < maxAttempts)
                await Task.Delay(TimeSpan.FromMilliseconds(200 * attempt), context.RequestAborted);
        }
    }

    if (backendResponse is null)
    {
        breaker.RecordFailure();
        // lastException is logged server-side (RecordAndLog -> logger)
        // but never returned to the caller: since this catch-all is
        // unauthenticated by design, any external caller could otherwise
        // read internal hostnames/ports and raw socket error text from a
        // triggered backend failure.
        if (lastException is not null)
            logger.LogWarning(lastException, "Backend '{BackendKey}' unreachable after {Attempts} attempt(s)", backendKey, maxAttempts);
        context.Response.StatusCode = StatusCodes.Status502BadGateway;
        context.Response.Headers["X-Circuit-Breaker"] = breaker.State.ToString().ToLowerInvariant();
        await context.Response.WriteAsJsonAsync(new
        {
            error = $"Backend for '{backendKey}' unreachable after {maxAttempts} attempt(s).",
            domain,
            mode,
            correlationId
        });
        RecordAndLog(502);
        return;
    }

    breaker.RecordSuccess();

    using (backendResponse)
    {
        context.Response.StatusCode = (int)backendResponse.StatusCode;
        context.Response.Headers["X-LegacyX-Routed-To"] = mode;
        context.Response.Headers["X-Circuit-Breaker"] = breaker.State.ToString().ToLowerInvariant();

        var contentType = backendResponse.Content.Headers.ContentType?.ToString();
        if (contentType is not null) context.Response.ContentType = contentType;

        await backendResponse.Content.CopyToAsync(context.Response.Body);
        RecordAndLog((int)backendResponse.StatusCode);
    }
}).RequireRateLimiting("general");

app.Run();

static JwtPrincipal? ValidateBearer(HttpContext context, JwtService jwt)
{
    if (!context.Request.Headers.TryGetValue("Authorization", out var authHeader)) return null;
    var value = authHeader.ToString();
    if (!value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
    return jwt.Validate(value["Bearer ".Length..].Trim());
}

// Tenant is checked before role: a valid token for the wrong tenant is a
// 403 "cross-tenant" denial (audited as such), not a generic
// insufficient-role 403 — the spec draws that distinction explicitly.
//
// requiredTenant is optional because two kinds of endpoint exist here.
// /admin/aviation/flights/... belongs to one tenant and names it. But
// /admin/routing, /admin/circuit-breakers and /admin/audit-log now serve
// both tenants and scope their *response* to whichever tenant the token
// carries — there's no single required tenant to check against, so they
// pass null and the role set is looked up for the caller's own tenant. A
// token whose tenant isn't in the policy at all resolves to an empty role
// list, which denies.
static AuthResult Authorize(HttpContext context, JwtService jwt, AuditLog audit, RolePolicy policy, string? requiredTenant = null)
{
    if (!context.Request.Headers.TryGetValue("Authorization", out _))
        return new AuthResult(null, Results.Json(new { error = "Authentication required." }, statusCode: 401));

    var principal = ValidateBearer(context, jwt);
    if (principal is null)
        return new AuthResult(null, Results.Json(new { error = "Invalid or expired token." }, statusCode: 401));

    if (requiredTenant is not null && principal.TenantId != requiredTenant)
    {
        audit.Record(principal.Subject, principal.TenantId, "CROSS_TENANT_DENIED", requiredTenant, principal.TenantId, requiredTenant, "DENIED");
        return new AuthResult(principal, Results.Json(new { error = $"Token belongs to tenant '{principal.TenantId}', this resource requires '{requiredTenant}'." }, statusCode: 403));
    }

    var allowedRoles = policy.For(principal.TenantId);
    if (!allowedRoles.Contains(principal.Role))
        return new AuthResult(principal, Results.Json(new
        {
            // Deliberately lists only the caller's own tenant's roles — the
            // other tenant's role names are none of their business.
            error = allowedRoles.Length == 0
                ? "This action is not available to your tenant."
                : $"Requires one of: {string.Join(", ", allowedRoles)}."
        }, statusCode: 403));

    return new AuthResult(principal, null);
}

static bool IsValidCorrelationId(string? value) =>
    !string.IsNullOrEmpty(value) && Regex.IsMatch(value, "^[a-zA-Z0-9-]{1,64}$");

public record RoutingModeRequest(string Mode);
public record LoginRequest(string Username, string Password);
public record FlightStatusRequest(string Status);
public record AuthResult(JwtPrincipal? Principal, IResult? Status);
