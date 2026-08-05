export interface NavComponent {
  label: string;
  /** Route path, e.g. "/ui-components/ChatTopBar" */
  path: string;
}

export interface NavLayer {
  label: string;
  /** Identifier used for keying — layers do NOT have their own routes */
  id: string;
  components: NavComponent[];
}

export interface NavItem {
  label: string;
  path: string;
  /** If present, this item renders as a sidebar accordion */
  layers?: NavLayer[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const UI_LAYERS: NavLayer[] = [
  {
    label: "Layer 1 — Drop-in",
    id: "layer-1",
    components: [
      { label: "GluonAgentPanel", path: "/ui-components/GluonAgentPanel" },
    ],
  },
  {
    label: "Layer 2 — Compose",
    id: "layer-2",
    components: [
      { label: "ChatTopBar",       path: "/ui-components/ChatTopBar" },
      { label: "ChatMessageList",  path: "/ui-components/ChatMessageList" },
      { label: "ChatInputBar",     path: "/ui-components/ChatInputBar" },
    ],
  },
  {
    label: "Layer 3 — Styled Atomic",
    id: "layer-3",
    components: [
      { label: "ModeSwitch",             path: "/ui-components/ModeSwitch" },
      { label: "NewChatButton",          path: "/ui-components/NewChatButton" },
      { label: "ChatSelect",             path: "/ui-components/ChatSelect" },
      { label: "ChatSelectMenu",         path: "/ui-components/ChatSelectMenu" },
      { label: "EmptyView",              path: "/ui-components/EmptyView" },
      { label: "SuggestedPromptButton",  path: "/ui-components/SuggestedPromptButton" },
      { label: "ChatInput",              path: "/ui-components/ChatInput" },
      { label: "AttachButton",           path: "/ui-components/AttachButton" },
      { label: "MicButton",              path: "/ui-components/MicButton" },
      { label: "SendButton",             path: "/ui-components/SendButton" },
      { label: "SlashCommandMenu",       path: "/ui-components/SlashCommandMenu" },
      { label: "TranscriptionIndicator", path: "/ui-components/TranscriptionIndicator" },
    ],
  },
  {
    label: "Layer 4 — Headless",
    id: "layer-4",
    components: [
      { label: "Session hooks",    path: "/ui-components/hooks-session" },
      { label: "Input hooks",      path: "/ui-components/hooks-input" },
      { label: "Voice hooks",      path: "/ui-components/hooks-voice" },
      { label: "Message primitives", path: "/ui-components/headless-messages" },
      { label: "Input primitives",   path: "/ui-components/headless-input" },
    ],
  },
];

export const NAV: NavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { label: "Introduction", path: "/" },
      { label: "Quick Start", path: "/quick-start" },
      { label: "Deployment", path: "/deployment" },
    ],
  },
  {
    label: "Frontend",
    items: [
      { label: "UI Components", path: "/ui-components", layers: UI_LAYERS },
    ],
  },
  {
    label: "Agent",
    items: [
      { label: "Configuration", path: "/configuration" },
      { label: "AI Providers", path: "/providers" },
      { label: "Tools", path: "/tools" },
      { label: "Skills", path: "/skills" },
      { label: "Action Blocks", path: "/action-blocks" },
      { label: "Context Providers", path: "/context" },
      { label: "Auth", path: "/auth" },
      { label: "Lifecycle Hooks", path: "/hooks" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "CLI Reference", path: "/cli" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "Package Exports", path: "/exports" },
    ],
  },
];
