namespace DeepFlow.Api;

public class AutoShutdownService : BackgroundService
{
    private DateTime _lastHeartbeat = DateTime.UtcNow;
    private readonly IHostApplicationLifetime _lifetime;
    private readonly ILogger<AutoShutdownService> _logger;
    private bool _isDevMode;

    public AutoShutdownService(IHostApplicationLifetime lifetime, ILogger<AutoShutdownService> logger, IWebHostEnvironment env)
    {
        _lifetime = lifetime;
        _logger = logger;
        _isDevMode = env.IsDevelopment();
        // Initialize with current time so it doesn't die immediately on startup
        _lastHeartbeat = DateTime.UtcNow.AddSeconds(30); // Give 30s grace period on startup
    }

    public void RecordHeartbeat()
    {
        _lastHeartbeat = DateTime.UtcNow;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Only run this logic if we are launched via the specific launcher that sets this env var
        // OR just run it in Development. Let's stick to Development for now, or check a flag.
        // The user wants "Close webpage -> End service".
        
        if (!_isDevMode) return;

        _logger.LogInformation("AutoShutdownService started. Monitoring heartbeats...");

        while (!stoppingToken.IsCancellationRequested)
        {
            var timeSinceLast = DateTime.UtcNow - _lastHeartbeat;
            
            // If no heartbeat for 10 seconds, shut down
            if (timeSinceLast.TotalSeconds > 10)
            {
                _logger.LogWarning($"No heartbeat received for {timeSinceLast.TotalSeconds:F1} seconds. Shutting down...");
                _lifetime.StopApplication();
                return;
            }

            await Task.Delay(1000, stoppingToken);
        }
    }
}
