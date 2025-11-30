using System;
using System.Collections.Generic;

namespace DeepFlow.Core.Entities;

public class Essay
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public string? TopicDescription { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public List<EssayVersion> Versions { get; set; } = new();
}

public class EssayVersion
{
    public Guid Id { get; set; }
    public Guid EssayId { get; set; }
    public DateTime Timestamp { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Note { get; set; }
}
