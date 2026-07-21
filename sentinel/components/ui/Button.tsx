import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent rounded-xl disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[var(--color-accent)] hover:bg-[#3d5ce5] text-white shadow-lg shadow-[var(--color-accent)]/20 focus:ring-[var(--color-accent)]",
    secondary: "bg-white/60 hover:bg-white/80 text-[var(--color-text-primary)] border border-white/50 shadow-sm focus:ring-gray-400 backdrop-blur-sm",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-200 focus:ring-red-500",
    ghost: "hover:bg-white/50 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
