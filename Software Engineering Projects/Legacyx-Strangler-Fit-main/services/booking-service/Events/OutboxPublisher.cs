using Confluent.Kafka;
using Microsoft.EntityFrameworkCore;
using BookingService.Data;

namespace BookingService.Events;

// Same pattern as order-service's OutboxPublisher — polls for
// unpublished rows, publishes to Kafka, only marks published after
// Kafka confirms. legacyx.aviation.tickets is the topic; Passenger
// Service's TicketIssuedListener is the (only) consumer today.
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
            var db = scope.ServiceProvider.GetRequiredService<BookingDbContext>();

            var pending = await db.OutboxMessages
                .Where(m => m.PublishedAt == null)
                .OrderBy(m => m.Id)
                .Take(20)
                .ToListAsync(stoppingToken);

            foreach (var message in pending)
            {
                try
                {
                    await producer.ProduceAsync("legacyx.aviation.tickets", new Message<string, string>
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
