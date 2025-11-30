
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { History } from './components/History';
import { Essay, ViewState } from './types';
import { getEssayById } from './services/storage';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [activeEssay, setActiveEssay] = useState<Essay | null>(null);

  // Simple routing handler
  const handleNewEssay = (topic?: string, topicDescription?: string) => {
    const newEssay: Essay = {
      id: uuidv4(),
      title: '',
      content: '',
      topic: topic,
      topicDescription: topicDescription,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setActiveEssay(newEssay);
    setView(ViewState.EDITOR);
  };

  const handleOpenEssay = (id: string) => {
    const essay = getEssayById(id);
    if (essay) {
      setActiveEssay(essay);
      setView(ViewState.EDITOR);
    }
  };

  const handleSaveEssay = (essay: Essay) => {
    // Update local state and persist (persisting is handled in component but this keeps state fresh)
    setActiveEssay(essay);
    import('./services/storage').then(mod => mod.saveEssay(essay));
  };

  const renderView = () => {
    switch (view) {
      case ViewState.HOME:
        return (
          <Dashboard 
            onNewEssay={handleNewEssay}
            onOpenEssay={handleOpenEssay}
            onViewHistory={() => setView(ViewState.HISTORY)}
          />
        );
      case ViewState.EDITOR:
        return activeEssay ? (
          <Editor 
            initialEssay={activeEssay}
            onSave={handleSaveEssay}
            onBack={() => setView(ViewState.HOME)}
          />
        ) : null;
      case ViewState.HISTORY:
        return (
          <History 
            onBack={() => setView(ViewState.HOME)}
            onOpenEssay={handleOpenEssay}
          />
        );
      default:
        return <div>Error</div>;
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-orange-100 selection:text-orange-900">
      {renderView()}
    </div>
  );
};

export default App;
