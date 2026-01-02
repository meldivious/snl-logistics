
import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);
  const [pathIndex, setPathIndex] = useState(0);

  const dimensions = {
    sm: 'h-8',
    md: 'h-14',
    lg: 'h-28',
    xl: 'h-48'
  };

  // Potential locations for the logo based on different environment structures
  const logoPaths = [
    './components/logo.png',
    './logo.png',
    'logo.png',
    '/components/logo.png',
    '/logo.png'
  ];

  const handleError = () => {
    if (pathIndex < logoPaths.length - 1) {
      setPathIndex(prev => prev + 1);
    } else {
      setHasError(true);
      console.warn('All potential logo paths failed to load.');
    }
  };

  if (hasError) {
    // Elegant typographic fallback if image fails entirely
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`bg-[#FF3D00] text-white font-black italic rounded flex items-center justify-center ${dimensions[size]} aspect-square shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black`}>
          SNL
        </div>
        {size !== 'sm' && (
          <span className="font-black italic text-black tracking-tighter uppercase leading-none hidden xs:block">
            <span className="text-[#FF3D00]">SNL</span><br/>LOGISTICS
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoPaths[pathIndex]}
        alt="SNL Logistics Logo"
        className={`${dimensions[size]} w-auto object-contain`}
        onError={handleError}
      />
      {size !== 'sm' && (
        <span className="font-black italic text-black tracking-tighter uppercase leading-none hidden xs:block">
          <span className="text-[#FF3D00]">SNL</span><br/>LOGISTICS
        </span>
      )}
    </div>
  );
};

export default Logo;
