FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/ ./
RUN dotnet publish LangoSoft.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# Render injects $PORT at runtime; ASP.NET Core reads it via UseUrls in Program.cs
EXPOSE 10000
ENTRYPOINT ["dotnet", "LangoSoft.API.dll"]
