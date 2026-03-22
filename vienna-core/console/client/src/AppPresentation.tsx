/**
 * Vienna OS Presentation Mode
 * Premium UI for product demonstrations
 * 
 * Usage: Replace App.tsx import in main.tsx with AppPresentation.tsx
 */

import React, { useEffect, useState } from 'react';
import { PresentationNav, type NavSection } from './components/layout/PresentationNav.js';
import { PresentationNowPage } from './pages/PresentationNowPage.js';
import './styles/presentation.css';

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('now');
  
  // Hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as NavSection;
      const validSections: NavSection[] = ['now', 'runtime', 'workspace', 'history', 'services', 'settings'];
      
      if (validSections.includes(hash)) {
        setCurrentSection(hash);
      } else {
        setCurrentSection('now');
        window.history.replaceState(null, '', '#now');
      }
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const handleNavigate = (section: NavSection) => {
    window.location.hash = section;
  };
  
  // Render page based on current section
  const renderPage = () => {
    switch (currentSection) {
      case 'now':
        return <PresentationNowPage />;
      
      case 'runtime':
        return <PlaceholderPage title="Runtime Control Plane" icon="⚙️" />;
      
      case 'workspace':
        return <PlaceholderPage title="Investigation Workspace" icon="📁" />;
      
      case 'history':
        return <PlaceholderPage title="Execution Ledger" icon="📜" />;
      
      case 'services':
        return <PlaceholderPage title="Infrastructure Services" icon="🔧" />;
      
      case 'settings':
        return <PlaceholderPage title="Operator Settings" icon="⚡" />;
      
      default:
        return <PresentationNowPage />;
    }
  };
  
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <PresentationNav currentSection={currentSection} onNavigate={handleNavigate} />
      <main className="max-w-7xl mx-auto px-6">
        {renderPage()}
      </main>
    </div>
  );
}

function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center justify-center" style={{ 
      minHeight: 'calc(100vh - 80px)',
      paddingTop: '80px',
    }}>
      <div className="glass-panel p-12 text-center fade-in">
        <div className="text-6xl mb-6">{icon}</div>
        <h1 className="text-3xl font-bold gradient-text mb-4">{title}</h1>
        <p className="text-gray-400 text-lg">
          This section is available in the full Vienna OS dashboard
        </p>
        <div className="mt-8">
          <button 
            className="btn-primary"
            onClick={() => window.location.hash = 'now'}
          >
            ← Back to Now
          </button>
        </div>
      </div>
    </div>
  );
}
