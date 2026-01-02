
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const dimensions = {
    sm: 'h-8',
    md: 'h-14',
    lg: 'h-28',
    xl: 'h-48'
  };

  // Using a cleaner relative path that works better from the root
  const logoPath = './components/logo.png';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoPath}
        alt="SNL Logistics Logo"
        className={`${dimensions[size]} w-auto object-contain`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // If the nested path fails, try root-relative
          if (target.src.includes('components/')) {
            target.src = 'logo.png';
          }
        }}
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
