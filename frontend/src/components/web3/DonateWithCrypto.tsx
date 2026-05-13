// src/components/DonateWithCrypto.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/context/AuthContext';
import { getContract, parseEther } from '@/lib/web3/contract';

interface Props {
  campaignId: number;
  eventId?: string;
  eventTitle?: string;
  onSuccess?: () => void;
}

export function DonateWithCrypto({ campaignId, eventId, eventTitle, onSuccess }: Props) {
  const { address, signer, connecting, connect, disconnect } = useWallet();
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const handleDonate = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;
    try {
      setStatus('pending');

      // 1. Verify network before attempting anything
      const network = await signer.provider.getNetwork();
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const expectedChainId = BigInt(isLocal ? 31337 : 80002);

      if (network.chainId !== expectedChainId) {
        // Automatically request network switch
        try {
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: isLocal ? '0x7a69' : '0x13882' }],
          });
          // Wait for a second for the provider to catch up
          await new Promise(r => setTimeout(r, 1000));
        } catch (switchError: any) {
          throw new Error(`Please switch MetaMask to ${isLocal ? 'Hardhat Local (31337)' : 'Amoy (80002)'} to donate.`);
        }
      }

      const contract = getContract(signer);
      const tx = await contract.donate(campaignId, {
        value: parseEther(amount),
      });
      setTxHash(tx.hash);
      await tx.wait();

      // Record donation to Firestore and send receipt email
      if (user && eventId) {
        try {
          const network = await signer.provider.getNetwork();
          const token = await user.getIdToken();
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              method: 'crypto',
              txHash: tx.hash,
              walletAddress: address,
              amount,
              chainId: Number(network.chainId),
              eventId,
              eventTitle: eventTitle || 'NexusAid Campaign',
              userId: user.uid,
              userName: profile?.displayName || user.displayName || 'Anonymous',
              userEmail: user.email || '',
            }),
          });
          const result = await verifyRes.json();
          if (result.receiptId) setReceiptId(result.receiptId);
        } catch (e) {
          console.error('Non-critical: failed to record donation to Firestore', e);
        }
      }

      setStatus('success');
      onSuccess?.();
    } catch (err: any) {
      console.error('Crypto donation failed:', err);
      // User rejected the transaction in MetaMask
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setStatus('idle');
        return;
      }
      setStatus('error');
    }
  };

  // Not connected state
  if (!address) {
    return (
      <div className="mt-4 pt-4 border-t border-outline-variant/30">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">currency_bitcoin</span>
          Or donate with Crypto
        </p>
        <button
          onClick={connect}
          disabled={connecting}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #f6851b 0%, #e2761b 50%, #cd6116 100%)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(226, 118, 27, 0.3)',
          }}
        >
          {connecting ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              Connecting...
            </>
          ) : (
            <>
              🦊 Connect MetaMask
            </>
          )}
        </button>
        <p className="text-xs text-on-surface-variant/60 text-center mt-2">
          Donations are recorded on-chain for full transparency
        </p>
      </div>
    );
  }

  // Connected state
  return (
    <div className="mt-4 pt-4 border-t border-outline-variant/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">currency_bitcoin</span>
          Crypto Donation
        </p>
        <button
          onClick={disconnect}
          className="text-xs text-on-surface-variant/60 hover:text-error transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Wallet badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-sm"
        style={{
          background: 'rgba(59,107,74,0.08)',
          border: '1px solid rgba(59,107,74,0.15)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
        />
        <span className="font-mono text-on-surface-variant text-xs truncate">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>

      {status === 'success' ? (
        <div className="bg-primary-fixed text-on-primary-fixed p-4 rounded-xl flex flex-col items-center gap-2 font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">verified</span>
            Donation confirmed on-chain!
          </div>
          {txHash && (
            <p className="text-xs font-mono opacity-70 break-all">
              tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
          {receiptId && (
            <p className="text-xs opacity-80 font-mono tracking-wider">
              Receipt: {receiptId}
            </p>
          )}
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(`I just donated MATIC to a disaster relief campaign on @NexusAid! 🛡️ Track my on-chain impact here: https://amoy.polygonscan.com/tx/${txHash}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">share</span>
            Share Proof of Impact
          </a>
        </div>
      ) : (
        <>
          {/* Amount input */}
          <div className="mb-4">
            <label className="text-sm font-medium text-on-surface block mb-2">
              Amount (MATIC)
            </label>
            <div className="flex gap-2">
              {['0.01', '0.05', '0.1'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${amount === preset
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-variant/50 text-on-surface-variant hover:bg-surface-variant'
                    }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl bg-surface-variant/30 border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Donate button */}
          <button
            onClick={handleDonate}
            disabled={status === 'pending' || !amount || parseFloat(amount) <= 0}
            className="w-full py-3.5 rounded-xl font-bold shadow transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: status === 'pending'
                ? 'var(--color-surface-variant)'
                : 'linear-gradient(135deg, #f6851b 0%, #e2761b 50%, #cd6116 100%)',
              color: '#fff',
              boxShadow: status === 'pending' ? 'none' : '0 4px 14px rgba(226, 118, 27, 0.3)',
            }}
          >
            {status === 'pending' ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Confirming on chain...
              </>
            ) : (
              `Donate ${amount} MATIC`
            )}
          </button>

          {status === 'error' && (
            <p className="text-xs text-error text-center mt-2 font-medium">
              Transaction failed. Please try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
