namespace Gateway.Resilience;

public enum CircuitState { Closed, Open, HalfOpen }

// Closed: requests flow normally. After enough consecutive failures,
// Open: fail fast, don't even attempt the call, for `openDuration`.
// Then HalfOpen: let exactly one trial request through — success closes
// the circuit, failure re-opens it. Standard three-state pattern; see
// docs/architecture/resilience.md for why this is hand-rolled instead
// of Polly.
public class CircuitBreaker
{
    private readonly int _failureThreshold;
    private readonly TimeSpan _openDuration;
    private readonly object _lock = new();

    private CircuitState _state = CircuitState.Closed;
    private int _consecutiveFailures;
    private DateTime _openedAt = DateTime.MinValue;

    public CircuitBreaker(int failureThreshold = 3, TimeSpan? openDuration = null)
    {
        _failureThreshold = failureThreshold;
        _openDuration = openDuration ?? TimeSpan.FromSeconds(10);
    }

    public bool AllowRequest()
    {
        lock (_lock)
        {
            if (_state != CircuitState.Open) return true;

            if (DateTime.UtcNow - _openedAt >= _openDuration)
            {
                _state = CircuitState.HalfOpen;
                return true; // the one trial request
            }
            return false;
        }
    }

    public void RecordSuccess()
    {
        lock (_lock)
        {
            _consecutiveFailures = 0;
            _state = CircuitState.Closed;
        }
    }

    public void RecordFailure()
    {
        lock (_lock)
        {
            _consecutiveFailures++;
            if (_state == CircuitState.HalfOpen || _consecutiveFailures >= _failureThreshold)
            {
                _state = CircuitState.Open;
                _openedAt = DateTime.UtcNow;
            }
        }
    }

    public CircuitState State { get { lock (_lock) { return _state; } } }
}
