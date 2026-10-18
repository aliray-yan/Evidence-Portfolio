using System.Text;

namespace Gateway.Observability;

// Hand-written Prometheus text exposition format — no prometheus-net
// package needed, same "keep the gateway dependency-free and testable"
// reasoning as the routing and resilience pieces. The format itself is
// plain text with a documented structure, not complex enough to justify
// a dependency just to generate it.
public class MetricsRegistry
{
    private readonly object _lock = new();
    private readonly Dictionary<(string Domain, string Mode, int Status), long> _requestCounts = new();
    private readonly Dictionary<string, List<double>> _durationsMs = new();

    public void RecordRequest(string domain, string mode, int status, double durationMs)
    {
        lock (_lock)
        {
            var key = (domain, mode, status);
            _requestCounts[key] = _requestCounts.GetValueOrDefault(key) + 1;

            if (!_durationsMs.TryGetValue(domain, out var list))
            {
                list = new List<double>();
                _durationsMs[domain] = list;
            }
            list.Add(durationMs);
            if (list.Count > 1000) list.RemoveAt(0); // cap memory, this is a demo not a real TSDB
        }
    }

    // Deliberately one metric name with domain/mode/status as labels,
    // not separate legacy_requests_total / modern_requests_total metric
    // names like the spec's literal example — this is the more idiomatic
    // Prometheus convention (one metric, dimensions as labels), and
    // `sum by (mode) (legacyx_gateway_requests_total)` gets you the same
    // legacy-vs-modern split the spec's separate metrics would.
    public string RenderPrometheusText(Resilience.CircuitBreakerRegistry breakers)
    {
        lock (_lock)
        {
            var sb = new StringBuilder();

            sb.AppendLine("# HELP legacyx_gateway_requests_total Total requests handled by the gateway");
            sb.AppendLine("# TYPE legacyx_gateway_requests_total counter");
            foreach (var ((domain, mode, status), count) in _requestCounts)
                sb.AppendLine($"legacyx_gateway_requests_total{{domain=\"{domain}\",mode=\"{mode}\",status=\"{status}\"}} {count}");

            sb.AppendLine("# HELP legacyx_gateway_request_duration_ms_avg Average request duration in milliseconds (last 1000 requests per domain)");
            sb.AppendLine("# TYPE legacyx_gateway_request_duration_ms_avg gauge");
            foreach (var (domain, durations) in _durationsMs)
            {
                if (durations.Count == 0) continue;
                sb.AppendLine($"legacyx_gateway_request_duration_ms_avg{{domain=\"{domain}\"}} {durations.Average():F2}");
            }

            sb.AppendLine("# HELP legacyx_gateway_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half_open)");
            sb.AppendLine("# TYPE legacyx_gateway_circuit_breaker_state gauge");
            foreach (var (backend, state) in breakers.Snapshot())
            {
                var value = state switch { "Closed" => 0, "Open" => 1, "HalfOpen" => 2, _ => -1 };
                sb.AppendLine($"legacyx_gateway_circuit_breaker_state{{backend=\"{backend}\"}} {value}");
            }

            return sb.ToString();
        }
    }
}
