// Representative example, not exhaustive across every controller —
// see docs/architecture/testing.md for why this one file stands in for
// the full "every service must have unit/integration tests" ask.
//
// Uses WebApplicationFactory + EF Core's InMemory provider so these
// tests don't need a real Postgres — standard ASP.NET Core integration
// test pattern. Like everything else in this project depending on
// NuGet, `dotnet test` hasn't been run here (see MANUAL.md) — this is
// written to the pattern correctly, not blindly.

using System.Net;
using System.Net.Http.Json;
using LegacyMonolith.Data;
using LegacyMonolith.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace LegacyMonolith.Tests;

public class CustomersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public CustomersControllerTests(WebApplicationFactory<Program> factory)
    {
        // Generated once here, not inside the ConfigureServices lambda —
        // WebApplicationFactory's deferred host building can invoke that
        // lambda more than once, and Guid.NewGuid() inline would then
        // produce two different in-memory database names for what's
        // supposed to be one shared store, making a Create-then-GetById
        // round trip within the same test flakily 404.
        var dbName = $"test-{Guid.NewGuid()}";
        var configuredFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<LegacyDbContext>>();
                services.AddDbContext<LegacyDbContext>(options =>
                    options.UseInMemoryDatabase(dbName));
            });
        });
        _client = configuredFactory.CreateClient();
    }

    [Fact]
    public async Task GetAll_ReturnsEmptyList_WhenNoCustomersExist()
    {
        var response = await _client.GetAsync("/api/customers");

        response.EnsureSuccessStatusCode();
        var customers = await response.Content.ReadFromJsonAsync<List<Customer>>();
        Assert.NotNull(customers);
        Assert.Empty(customers);
    }

    [Fact]
    public async Task Create_ReturnsCreated_WithValidCustomer()
    {
        var customer = new Customer { CustomerNo = "C100", CustomerName = "Test Customer", CustStatus = "A" };

        var response = await _client.PostAsJsonAsync("/api/customers", customer);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<Customer>();
        Assert.NotNull(created);
        Assert.Equal("C100", created!.CustomerNo);
        Assert.True(created.Id > 0);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenCustomerNoMissing()
    {
        var customer = new Customer { CustomerName = "No Number", CustStatus = "A" };

        var response = await _client.PostAsJsonAsync("/api/customers", customer);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_ForUnknownId()
    {
        var response = await _client.GetAsync("/api/customers/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetById_ReturnsCustomer_AfterCreate()
    {
        var created = await _client.PostAsJsonAsync("/api/customers",
            new Customer { CustomerNo = "C101", CustomerName = "Round Trip", CustStatus = "A" });
        var customer = await created.Content.ReadFromJsonAsync<Customer>();

        var response = await _client.GetAsync($"/api/customers/{customer!.Id}");

        response.EnsureSuccessStatusCode();
        var fetched = await response.Content.ReadFromJsonAsync<Customer>();
        Assert.Equal("C101", fetched!.CustomerNo);
    }
}
