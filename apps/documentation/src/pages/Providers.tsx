import { CodeBlock } from "../components/CodeBlock";

export function Providers() {
  return (
    <>
      <h1>AI Model Providers</h1>
      <p>
        Set <code>model</code> in <code>agent.config.json</code> to a <code>provider/model</code> string.
        The prefix selects the provider; everything else is the model ID. For each provider, set its API
        key and install its optional SDK package. Gluon detects both at startup and registers the provider
        automatically.
      </p>

      <h2>Supported providers</h2>
      <table className="doc-table">
        <thead>
          <tr><th>Provider</th><th>Model prefix</th><th>Env var</th><th>Install</th></tr>
        </thead>
        <tbody>
          {[
            ["OpenAI", "openai", "OPENAI_API_KEY", "npm i @ai-sdk/openai"],
            ["Anthropic", "anthropic", "ANTHROPIC_API_KEY", "npm i @ai-sdk/anthropic"],
            ["Google", "google", "GOOGLE_GENERATIVE_AI_API_KEY", "npm i @ai-sdk/google"],
            ["Mistral", "mistral", "MISTRAL_API_KEY", "npm i @ai-sdk/mistral"],
            ["Groq", "groq", "GROQ_API_KEY", "npm i @ai-sdk/groq"],
            ["xAI", "xai", "XAI_API_KEY", "npm i @ai-sdk/xai"],
            ["DeepSeek", "deepseek", "DEEPSEEK_API_KEY", "npm i @ai-sdk/deepseek"],
          ].map(([p, prefix, env, install]) => (
            <tr key={p}>
              <td>{p}</td>
              <td><code>{prefix}</code></td>
              <td><code>{env}</code></td>
              <td><code>{install}</code></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="callout">
        All provider packages are optional. If a provider's package is missing or its key is not set,
        that prefix is silently skipped — no error, just unavailable.
      </div>

      <h2>Examples</h2>
      <CodeBlock language="bash" filename=".env">{`OPENAI_API_KEY=sk-...`}</CodeBlock>
      <CodeBlock language="json" filename="agent.config.json">{`{ "model": "openai/o4-mini" }`}</CodeBlock>

      <CodeBlock language="bash" filename=".env">{`ANTHROPIC_API_KEY=sk-ant-...`}</CodeBlock>
      <CodeBlock language="json" filename="agent.config.json">{`{ "model": "anthropic/claude-sonnet-4.6" }`}</CodeBlock>

      <h2>Via Vercel AI Gateway</h2>
      <p>
        Prefix any model string with <code>gateway/</code> to route through{" "}
        <a href="https://vercel.com/docs/ai-gateway" target="_blank" rel="noreferrer">Vercel AI Gateway</a>.
        One key covers every supported model; no per-provider packages needed.
      </p>
      <CodeBlock language="bash" filename=".env">{`AI_GATEWAY_API_KEY=your_gateway_key`}</CodeBlock>
      <CodeBlock language="json" filename="agent.config.json">{`{ "model": "gateway/anthropic/claude-sonnet-4.6" }
{ "model": "gateway/google/gemini-2.0-flash" }`}</CodeBlock>

      <h2>Custom env var names</h2>
      <p>If your key is stored under a different name, remap it via <code>env</code>:</p>
      <CodeBlock language="json">{`{
  "model": "anthropic/claude-sonnet-4.6",
  "env": { "anthropicApiKey": "MY_CLAUDE_KEY" }
}`}</CodeBlock>

      <h2>Reasoning models</h2>
      <p>
        When <code>sendReasoning: true</code>, Gluon automatically enables provider-specific
        reasoning options:
      </p>
      <table className="doc-table">
        <thead>
          <tr><th>Pattern</th><th>Options sent</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>openai/o*</code> or <code>gateway/openai/o*</code></td>
            <td><code>reasoningEffort: "medium"</code></td>
          </tr>
          <tr>
            <td><code>anthropic/*</code> or <code>gateway/anthropic/*</code></td>
            <td><code>thinking: &#123; type: "enabled", budgetTokens: min(maxOutput×0.6, 10000) &#125;</code></td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
