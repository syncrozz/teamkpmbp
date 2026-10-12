import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { AuthStatus } from '../../types';

interface AuthGateProps {
  authStatus: AuthStatus;
  onAuthSuccess: (status: AuthStatus) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ authStatus, onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'admin'>(authStatus.isSetup ? 'team' : 'admin');
  
  // Team Access State
  const [teamPasscode, setTeamPasscode] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Admin Login State
  const [adminEmail, setAdminEmail] = useState(authStatus.adminEmail || 'khaikerr@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Initial Setup State
  const [setupAdminPassword, setSetupAdminPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupTeamPasscode, setSetupTeamPasscode] = useState('KPMBP2026');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamPasscode.trim()) {
      setTeamError('Please enter the team access passcode.');
      return;
    }
    setTeamLoading(true);
    setTeamError(null);
    try {
      await api.teamLogin(teamPasscode.trim());
      const updatedStatus = await api.getAuthStatus();
      onAuthSuccess(updatedStatus);
    } catch (err: any) {
      setTeamError(err.message || 'Failed to authenticate. Please verify your team passcode.');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setAdminError('Please enter the administrator password.');
      return;
    }
    setAdminLoading(true);
    setAdminError(null);
    try {
      await api.adminLogin(adminPassword, adminEmail);
      const updatedStatus = await api.getAuthStatus();
      onAuthSuccess(updatedStatus);
    } catch (err: any) {
      setAdminError(err.message || 'Invalid administrator credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleInitialSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupAdminPassword.length < 6) {
      setSetupError('Administrator password must be at least 6 characters long.');
      return;
    }
    if (setupAdminPassword !== setupConfirmPassword) {
      setSetupError('Passwords do not match. Please re-enter.');
      return;
    }
    if (setupTeamPasscode.trim().length < 3) {
      setSetupError('Team access passcode must be at least 3 characters.');
      return;
    }

    setSetupLoading(true);
    setSetupError(null);
    try {
      await api.initialSetup(setupAdminPassword, setupTeamPasscode.trim());
      const updatedStatus = await api.getAuthStatus();
      onAuthSuccess(updatedStatus);
    } catch (err: any) {
      setSetupError(err.message || 'Failed to initialize administrator credentials.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Competition Hub KPMBP</h1>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1">
            <span>KPM Bandar Penawar</span>
            <span aria-hidden="true">·</span>
            <span>Restricted Access Portal</span>
          </div>
        </div>

        {/* Card container */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
          {!authStatus.isSetup ? (
            /* First Time Initialization Flow */
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Initial Portal Setup</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Initialize administrator credentials for <span className="text-indigo-300 font-medium">{authStatus.adminEmail || 'khaikerr@gmail.com'}</span> and set the contingent team access passcode.
                </p>
              </div>

              {setupError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{setupError}</span>
                </div>
              )}

              <form onSubmit={handleInitialSetupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    value={authStatus.adminEmail || 'khaikerr@gmail.com'}
                    disabled
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Set Administrator Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={setupAdminPassword}
                    onChange={(e) => setSetupAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm Administrator Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="pt-2 border-t border-slate-700">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Team Access Passcode
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KPMBP2026"
                    value={setupTeamPasscode}
                    onChange={(e) => setSetupTeamPasscode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500 uppercase tracking-wider font-mono transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This passcode will be distributed to your contingent athletes and team members for read-only access.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-full mt-6 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {setupLoading ? 'Initializing...' : 'Initialize & Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            /* Regular Sign In with Team and Admin tabs */
            <div>
              {/* Mode switch */}
              <div className="flex p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('team');
                    setTeamError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'team'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Team Access
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Administrator
                </button>
              </div>

              {activeTab === 'team' ? (
                /* Team Passcode Form */
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white">Contingent Team Access</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enter the official team access passcode provided by your contingent management.
                    </p>
                  </div>

                  {teamError && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{teamError}</span>
                    </div>
                  )}

                  <form onSubmit={handleTeamSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Team Passcode
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="ENTER PASSCODE"
                        value={teamPasscode}
                        onChange={(e) => setTeamPasscode(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono uppercase tracking-widest text-center text-white placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={teamLoading}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {teamLoading ? 'Verifying...' : 'Access Portal'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="mt-5 text-center">
                    <p className="text-[11px] text-slate-500">
                      Need access? Please contact the KPMBP Contingent Secretariat.
                    </p>
                  </div>
                </div>
              ) : (
                /* Administrator Login Form */
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white">Administrator Sign In</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sign in to manage schedules, documents, and portal contents.
                    </p>
                  </div>

                  {adminError && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Administrator Email
                      </label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {adminLoading ? 'Signing in...' : 'Sign In as Admin'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Restricted for authorized KPM Bandar Penawar contingent only</span>
        </div>
      </div>
    </div>
  );
};
