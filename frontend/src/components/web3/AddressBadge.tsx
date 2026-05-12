'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AddressBadgeProps {
  address: string;
  isHardhat?: boolean;
  className?: string;
}

export function AddressBadge({ address, isHardhat, className = '' }: AddressBadgeProps) {
  const [copied, setCopied] = useState(false);

  const truncated = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const explorerUrl = isHardhat 
    ? null 
    : `https://amoy.polygonscan.com/address/${address}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all ${className}`}
      style={{
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <span className="text-on-surface truncate max-w-[80px] sm:max-w-none">{truncated}</span>
      
      <div className="flex items-center gap-1 ml-1 border-l border-glass pl-2">
        <button
          onClick={copyToClipboard}
          className="hover:text-primary transition-colors p-0.5"
          title="Copy Address"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </button>
        
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors p-0.5"
            title="View on Explorer"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
