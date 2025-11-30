using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DeepFlow.Core.Entities;
using DeepFlow.Infrastructure.Data;

namespace DeepFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EssaysController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EssaysController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEssays()
    {
        return Ok(await _context.Essays.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEssay(Guid id)
    {
        var essay = await _context.Essays.FindAsync(id);
        if (essay == null) return NotFound();
        return Ok(essay);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEssay([FromBody] Essay essay)
    {
        essay.Id = Guid.NewGuid();
        essay.CreatedAt = DateTime.UtcNow;
        essay.UpdatedAt = DateTime.UtcNow;
        
        _context.Essays.Add(essay);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetEssay), new { id = essay.Id }, essay);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEssay(Guid id, [FromBody] Essay essay)
    {
        var existing = await _context.Essays.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Title = essay.Title;
        existing.Content = essay.Content;
        existing.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
}
