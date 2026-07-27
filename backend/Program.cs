using LangoSoft.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Render (and other PaaS) inject $PORT; fall back to 5000 for local dev
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://+:{port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<TextService>();
builder.Services.AddScoped<GroqService>();
builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowReact", p =>
        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseCors("AllowReact");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

var textService = app.Services.GetRequiredService<TextService>();
await textService.InitializeAsync();

app.Run();
