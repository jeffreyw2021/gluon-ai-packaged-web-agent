import type { ReactNode } from "react";
import { AgentProvider } from "easy-setup-web-agent/react";
import WeatherBlock from "../agent/blocks/WeatherBlock";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <AgentProvider
          basePath="/api/agent"
          actionBlocks={{ get_weather: WeatherBlock }}
          suggestedPrompts={[
            "What's the weather like in New York?",
            "Calculate 15% tip on a $87.50 bill.",
            "Compare the weather in Tokyo vs London.",
          ]}
        >
          {children}
        </AgentProvider>
      </body>
    </html>
  );
}
