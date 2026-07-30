import { defineTool } from "easy-setup-web-agent";
import { z } from "zod";

export default defineTool({
  description:
    "Get the current weather for a city. Returns temperature (°C), conditions, humidity, and wind speed.",
  inputSchema: z.object({
    city: z.string().describe("The city name to get weather for"),
    country: z.string().optional().describe("Optional country code (e.g. US, JP, GB)"),
  }),
  execute: async ({ city, country }) => {
    // Mock weather data — replace with a real weather API call
    const seed = city.charCodeAt(0) + (country?.charCodeAt(0) ?? 0);
    const temp = Math.round(15 + (seed % 20));
    const conditions = ["Sunny", "Cloudy", "Partly cloudy", "Rainy", "Windy"][seed % 5];
    const humidity = 40 + (seed % 40);
    const windSpeed = 5 + (seed % 25);

    return {
      city,
      country: country ?? "Unknown",
      temperatureCelsius: temp,
      temperatureFahrenheit: Math.round(temp * 9 / 5 + 32),
      conditions,
      humidity: `${humidity}%`,
      windSpeedKmh: windSpeed,
    };
  },
});
