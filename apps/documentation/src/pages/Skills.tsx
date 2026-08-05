import { CodeBlock } from "../components/CodeBlock";

export function Skills() {
  return (
    <>
      <h1>Skills</h1>
      <p>
        Skills are Markdown documents the agent reads on demand. They are never injected into
        every request's system prompt. When <code>skills</code> is non-empty, Gluon adds a{" "}
        <code>load_skill</code> tool and instructs the agent to call it before using
        domain-specific tools.
      </p>

      <h2>Skills vs context providers</h2>
      <table className="doc-table">
        <thead>
          <tr><th></th><th>Skills</th><th>Context providers</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>When loaded</td>
            <td>On demand by the agent (<code>load_skill</code>)</td>
            <td>Every request, unconditionally</td>
          </tr>
          <tr>
            <td>Content type</td>
            <td>Static Markdown docs, procedures, reference</td>
            <td>Dynamic values: current time, user state, env data</td>
          </tr>
          <tr>
            <td>Token cost</td>
            <td>Only when read</td>
            <td>Always added to every system prompt</td>
          </tr>
        </tbody>
      </table>

      <div className="callout">
        Use <strong>skills</strong> for large reference material that is only sometimes needed.
        Use <strong>context providers</strong> for small dynamic strings that should always be present.
      </div>

      <h2>Creating a skill</h2>
      <CodeBlock language="bash">{`npx gluon-ai add-skill how-to-search
# → writes gluon/agent/skills/how-to-search.md and registers it in agent.config.json`}</CodeBlock>

      <CodeBlock language="markdown" filename="gluon/agent/skills/how-to-search.md">{`# How to search the web

Use the \`web_search\` tool with a concise query. Prefer recent date qualifiers
when the topic is time-sensitive. Always cite the source URL in your response.

## When NOT to search

- The answer is in your training data and does not change (e.g. language syntax).
- The user has already provided the source material inline.`}</CodeBlock>

      <CodeBlock language="json" filename="gluon/agent.config.json">{`{
  "skills": ["./agent/skills/how-to-search.md"]
}`}</CodeBlock>

      <p>
        At runtime the agent receives an index of available skills and their numbers.
        It calls <code>load_skill(index)</code> to fetch a document when it decides it's relevant.
        This keeps request context small while giving the agent access to deep documentation
        when needed.
      </p>

      <h2>Default behaviour</h2>
      <p>
        When <code>skills</code> is empty (the default), <code>load_skill</code> is not registered
        and no skill content is ever sent to the model.
      </p>

      <h2>Typical uses</h2>
      <ul>
        <li>Step-by-step procedures</li>
        <li>Domain glossaries</li>
        <li>API cheat-sheets</li>
        <li>Policy documents</li>
        <li>Tool usage guides</li>
      </ul>
    </>
  );
}
