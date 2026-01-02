
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo.tsx';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If installation is not available, scroll to calculator as a fallback
      navigate('/');
      window.location.hash = 'calculator';
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
  };

  return (
    <header className="bg-[#CCFF00] border-b-4 border-[#FF3D00] py-3 px-4 md:px-6 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="hover:opacity-90 transition-opacity flex items-center">
            <Logo size="sm" />
          </a>
        </div>

        <div className="flex items-center gap-3 md:gap-8">
          <a 
            href="#calculator" 
            onClick={(e) => { e.preventDefault(); navigate('/'); window.location.hash = 'calculator'; }} 
            className="text-[#FF3D00] hover:underline font-black text-[10px] md:text-[11px] tracking-widest hidden xs:block"
          >
            CALCULATOR
          </a>
          <button 
            onClick={handleInstallClick}
            className="bg-[#FF3D00] text-white px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-black text-[10px] md:text-xs tracking-widest hover:translate-x-0.5 hover:translate-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black active:translate-y-1 active:shadow-none transition-all italic uppercase block"
          >
            Install App
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
