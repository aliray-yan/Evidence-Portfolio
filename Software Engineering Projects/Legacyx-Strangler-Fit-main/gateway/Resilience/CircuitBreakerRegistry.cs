namespace Gateway.Resilience;

public class CircuitBreakerRegistry
{
    private readonly Dictionary<string, CircuitBreaker> _breakers = new();
    private readonly object _lock = new();

    public CircuitBreaker GetOrCreate(string key)
    {
        lock (_lock)
        {
            if (!_breakers.TryGetValue(key, out var breaker))
            {
                breaker = new CircuitBreaker();
                _breakers[key] = breaker;
            }
            return breaker;
        }
    }

    public IReadOnlyDictionary<string, string> Snapshot()
    {
        lock (_lock)
        {
            return _breakers.ToDictionary(kv => kv.Key, kv => kv.Value.State.ToString());
        }
    }
}
