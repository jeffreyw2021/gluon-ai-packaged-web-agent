import { HashRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Introduction } from "./pages/Introduction";
import { QuickStart } from "./pages/QuickStart";
import { UIComponents } from "./pages/UIComponents";
import { UIComponentDetail } from "./pages/UIComponentDetail";
import { Configuration } from "./pages/Configuration";
import { Providers } from "./pages/Providers";
import { Tools } from "./pages/Tools";
import { Skills } from "./pages/Skills";
import { ContextProviders } from "./pages/ContextProviders";
import { Auth } from "./pages/Auth";
import { ActionBlocks } from "./pages/ActionBlocks";
import { Hooks } from "./pages/Hooks";
import { CLIReference } from "./pages/CLIReference";
import { Deployment } from "./pages/Deployment";
import { Exports } from "./pages/Exports";

export default function App() {
  return (
    <HashRouter>
      <div className="layout-root">
        <Header />
        <div className="layout-body">
          <Sidebar />
          <main className="layout-main">
            <div className="layout-main-inner doc-content">
              <Routes>
                <Route path="/" element={<Introduction />} />
                <Route path="/quick-start" element={<QuickStart />} />
                <Route path="/deployment" element={<Deployment />} />
                <Route path="/ui-components" element={<UIComponents />} />
                <Route path="/ui-components/:component" element={<UIComponentDetail />} />
                <Route path="/action-blocks" element={<ActionBlocks />} />
                <Route path="/configuration" element={<Configuration />} />
                <Route path="/providers" element={<Providers />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/skills" element={<Skills />} />
                <Route path="/context" element={<ContextProviders />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/hooks" element={<Hooks />} />
                <Route path="/cli" element={<CLIReference />} />
                <Route path="/exports" element={<Exports />} />
              </Routes>
            </div>  {/* layout-main-inner */}
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
