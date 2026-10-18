using DotNetMastery.Api.DTOs;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DotNetMastery.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CodeController(CSharpRunnerService runner) : ControllerBase
{
    [HttpPost("run")]
    public async Task<ActionResult<RunCodeResult>> Run(RunCodeRequest request, CancellationToken cancellationToken)
    {
        var result = await runner.RunAsync(request.Code, request.Stdin, cancellationToken);
        return Ok(result);
    }
}
