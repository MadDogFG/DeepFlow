using DeepFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

using DeepFlow.Api;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Auto Shutdown Service
builder.Services.AddSingleton<AutoShutdownService>();
builder.Services.AddHostedService(provider => provider.GetRequiredService<AutoShutdownService>());

// Database
// Strategy: Robustly locate the project root to store data in 'D:\Code\DeepFlow\Data'
var baseDir = AppContext.BaseDirectory;
string dataFolder;

// 1. Try to find 'backend-dotnet' in the path (Standard Dev Structure)
var index = baseDir.IndexOf("backend-dotnet", StringComparison.OrdinalIgnoreCase);
if (index > 0)
{
    var root = baseDir.Substring(0, index);
    dataFolder = Path.Combine(root, "Data");
    Console.WriteLine($"[Storage] Found root via path structure: {dataFolder}");
}
else
{
    // 2. Try to find launcher.ps1 in current directory (Run from Root)
    var currentDir = Directory.GetCurrentDirectory();
    if (File.Exists(Path.Combine(currentDir, "launcher.ps1")))
    {
        dataFolder = Path.Combine(currentDir, "Data");
        Console.WriteLine($"[Storage] Found root via launcher.ps1: {dataFolder}");
    }
    else
    {
        // 3. Fallback to AppData (Guaranteed Persistence)
        dataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DeepFlow", "Data");
        Console.WriteLine($"[Storage] Using Fallback AppData: {dataFolder}");
    }
}

if (!Directory.Exists(dataFolder))
{
    Directory.CreateDirectory(dataFolder);
}

var dbPath = Path.Combine(dataFolder, "deepflow.db");

// Write a marker file
try 
{
    File.WriteAllText(Path.Combine(dataFolder, "storage_info.txt"), $"Database Path: {dbPath}\nLast Access: {DateTime.Now}\nBaseDir: {baseDir}");
}
catch { /* Ignore */ }

Console.WriteLine($"[Storage] Final Database Path: {dbPath}");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader());
});

var app = builder.Build();

// Ensure Database is Created and Migrated
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

app.MapControllers();

app.Run();
