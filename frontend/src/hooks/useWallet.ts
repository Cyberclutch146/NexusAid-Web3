'use client';
// src/hooks/useWallet.ts
// React hook for MetaMask wallet connection.
// Manages connection state, EIP-191 signing, and wallet linking.

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Extend window type for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

interface WalletState {
  address: string | null;
  signer: JsonRpcSigner | null;
  isConnecting: boolean;
  connecting: boolean; // alias for backward compat
  isLinking: boolean;
  isLinked: boolean;
  connect: () => Promise<void>;
  linkWallet: () => Promise<void>;
  disconnect: () => void;
}

const buildSignMessage = (address: string) =>
  `Welcome to NexusAid!\n\nSign this message to link your wallet.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;

export function useWallet(): WalletState {
  const { user, profile } = useAuth();

  const [address,      setAddress]      = useState<string | null>(null);
  const [signer,       setSigner]       = useState<JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLinking,    setIsLinking]    = useState(false);

  const isLinked = !!(profile?.walletAddress);

  // Auto-detect already-connected wallet on mount
  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts.length > 0) {
          const provider = new BrowserProvider(window.ethereum);
          const s = await provider.getSigner();
          setAddress(accounts[0]);
          setSigner(s);
        }
      } catch {
        // Silently ignore
      }
    };
    autoConnect();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChange = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAddress(null);
        setSigner(null);
      } else {
        setAddress(accounts[0]);
      }
    };
    window.ethereum.on('accountsChanged', handleChange);
    return () => window.ethereum?.removeListener('accountsChanged', handleChange);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not found. Please install the MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      // Switch to Polygon Amoy
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }], // 80002
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId:           '0x13882',
              chainName:         'Polygon Amoy Testnet',
              nativeCurrency:    { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls:           ['https://rpc-amoy.polygon.technology/'],
              blockExplorerUrls: ['https://amoy.polygonscan.com/'],
            }],
          });
        }
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const provider = new BrowserProvider(window.ethereum);
      const s = await provider.getSigner();

      setAddress(accounts[0]);
      setSigner(s);
      toast.success(`Connected: ${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}`);
    } catch (err: any) {
      if (err.code !== 4001) {
        toast.error('Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const linkWallet = useCallback(async () => {
    if (!user || !address || !signer) {
      toast.error('Connect your wallet first');
      return;
    }

    setIsLinking(true);
    try {
      const message   = buildSignMessage(address);
      const signature = await signer.signMessage(message);
      const idToken   = await user.getIdToken();

      const res = await fetch('/api/web3/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ walletAddress: address, signature, message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Wallet linked to your NexusAid account!');
    } catch (err: any) {
      if (err.code !== 4001) {
        toast.error(err.message || 'Failed to link wallet');
      } else {
        toast.error('Signature rejected');
      }
    } finally {
      setIsLinking(false);
    }
  }, [user, address, signer]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
  }, []);

  return {
    address,
    signer,
    isConnecting,
    connecting: isConnecting, // backward compat alias
    isLinking,
    isLinked,
    connect,
    linkWallet,
    disconnect,
  };
}
