import { useState, useEffect, useRef } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { HomeScreen } from './screens/HomeScreen';
import { DevicesScreen } from './screens/DevicesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RotationScreen } from './screens/RotationScreen';
import { GetActiveProxy } from '../wailsjs/go/main/App';
import { WindowSetSize, WindowSetMaxSize, WindowCenter } from '../wailsjs/runtime/runtime';
import './globals.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [proxyCountry, setProxyCountry] = useState('');
  const [measured, setMeasured] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const poll = () => {
      GetActiveProxy()
        .then(p => setProxyCountry(p?.country || ''))
        .catch(() => setProxyCountry(''));
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  // Measure all screens on mount, then resize window to fit the tallest
  useEffect(() => {
    if (measured || !measureRef.current) return;

    const raf = requestAnimationFrame(() => {
      if (!measureRef.current) return;
      const children = measureRef.current.children;
      let maxHeight = 0;
      for (let i = 0; i < children.length; i++) {
        const h = (children[i] as HTMLElement).offsetHeight;
        maxHeight = Math.max(maxHeight, h);
      }
      // TitleBar = 48px, TabBar = 56px + 20px bottom = 76px
      const totalHeight = maxHeight + 48 + 76 + 10; // +10 safety margin
      const finalHeight = Math.max(totalHeight, 500);

      WindowSetMaxSize(600, finalHeight);
      WindowSetSize(600, finalHeight);
      WindowCenter();
      setMeasured(true);
    });

    return () => cancelAnimationFrame(raf);
  }, [measured]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'devices':
        return <DevicesScreen />;
      case 'rotation':
        return <RotationScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <>
      {/* Hidden measurement container — renders all screens to find the tallest */}
      {!measured && (
        <div
          ref={measureRef}
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            width: '600px',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div><HomeScreen /></div>
          <div><DevicesScreen /></div>
          <div><RotationScreen /></div>
          <div><SettingsScreen /></div>
        </div>
      )}
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab} proxyCountry={proxyCountry}>
        {renderScreen()}
      </AppLayout>
    </>
  );
}

export default App;
