
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

  // If Logo.tsx and logo.png are both in the components folder,
  // then the path is simply './logo.png'
  const logoPath = './components/logo.png';

  return (
    <img 
      src={logoPath}
      alt="SNL Logistics Logo"
      className={`${dimensions[size]} ${className} w-auto object-contain`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        console.warn(`Logo failed to load at: ${target.src}. Trying fallback...`);
        // Fallback to absolute if relative fails
        if (!target.src.includes('components')) {
           target.src = 'components/logo.png';
        }
      }}
    />
  );
};

export default Logo;
