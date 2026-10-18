using Confluent.Kafka;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;

namespace OrderService.Events;

// Polls for unpublished OutboxMessage rows and publishes them to Kafka.
// Only marks a row published after Kafka confirms it — if Kafka is
// down, rows just accumulate and get picked up once it's back. See
// docs/architecture/event-architecture.md.
public class OutboxPublisher : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<OutboxPublisher> _logger;
    private readonly IConfiguration _config;

    public OutboxPublisher(IServiceProvider services, ILogger<OutboxPublisher> logger, IConfiguration config)
    {
        _services = services;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var bootstrapServers = _config["Kafka:BootstrapServers"] ?? "kafka:9092";
        var producerConfig = new ProducerConfig { BootstrapServers = bootstrapServers };
        using var producer = new ProducerBuilder<string, string>(producerConfig).Build();

        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();

            var pending = await db.OutboxMessages
                .Where(m => m.PublishedAt == null)
                .OrderBy(m => m.Id)
                .Take(20)
                .ToListAsync(stoppingToken);

            foreach (var message in pending)
            {
                try
                {
                    await producer.ProduceAsync("legacyx.orders", new Message<string, string>
                    {
                        Key = message.Id.ToString(),
                        Value = message.Payload
                    }, stoppingToken);

                    message.PublishedAt = DateTime.UtcNow;
                    _logger.LogInformation("Published outbox message {Id} ({EventType})", message.Id, message.EventType);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to publish outbox message {Id}, will retry next poll", message.Id);
                }
            }

            if (pending.Count > 0)
                await db.SaveChangesAsync(stoppingToken);

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
}
