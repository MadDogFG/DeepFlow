using Microsoft.AspNetCore.Mvc;

namespace DeepFlow.Api.Controllers;

[ApiController]
[Route("api/system")]
public class SystemController : ControllerBase
{
    private readonly AutoShutdownService _shutdownService;

    public SystemController(AutoShutdownService shutdownService)
    {
        _shutdownService = shutdownService;
    }

    [HttpPost("heartbeat")]
    public IActionResult Heartbeat()
    {
        _shutdownService.RecordHeartbeat();
        return Ok();
    }
}
