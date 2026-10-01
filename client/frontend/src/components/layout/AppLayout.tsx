import { TitleBar } from "./TitleBar";
import { TabBar } from "./TabBar";
import { FlagBackground } from "../FlagBackground";

type AppLayoutProps = {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  proxyCountry: string;
};

export function AppLayout({ children, activeTab, onTabChange, proxyCountry }: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-app)',
      backgroundImage: `radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 45%), radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 40%)`,
      color: 'var(--text-primary)',
      position: 'relative'
    }}>
      <FlagBackground countryCode={proxyCountry} />
      <TitleBar />
      
      <div style={{
        flex: 1,
        overflow: 'hidden',
        paddingBottom: '76px', // Space for floating TabBar (56px + 20px)
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </div>

      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
