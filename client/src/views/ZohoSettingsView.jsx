import React, { useState, useEffect } from 'react';
import {
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Database,
  Layers,
  Briefcase,
  Users,
  Clock,
  Key,
  Globe,
  Sliders,
  Sparkles
} from 'lucide-react';
import { api } from '../utils/api';

export default function ZohoSettingsView({
  zohoStatus,
  onRefreshZohoStatus,
  onSyncNow,
  isSyncing
}) {
  const [activeTab, setActiveTab] = useState('oauth'); // 'oauth', 'accounts', 'projects', 'logs'
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:5000/api/zoho/callback');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [dcRegion, setDcRegion] = useState('com');
  const [mockMode, setMockMode] = useState(true);

  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (zohoStatus?.config) {
      const c = zohoStatus.config;
      if (c.raw_client_id) setClientId(c.raw_client_id);
      if (c.redirect_uri) setRedirectUri(c.redirect_uri);
      setOrganizationId(c.organization_id || '');
      setOrganizationName(c.organization_name || '');
      setDcRegion(c.dc_region || 'com');
      setMockMode(Boolean(c.mock_mode));
    }
  }, [zohoStatus]);

  // Load explorer data when tab changes
  useEffect(() => {
    if (activeTab === 'accounts') {
      api.getChartOfAccounts().then(res => setAccounts(res.accounts || []));
    } else if (activeTab === 'projects') {
      api.getZohoProjects().then(res => setProjects(res.projects || []));
    } else if (activeTab === 'logs') {
      api.getSyncLogs().then(res => setSyncLogs(res.logs || []));
    }
  }, [activeTab]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const payload = {
        organization_id: organizationId,
        organization_name: organizationName,
        dc_region: dcRegion,
        mock_mode: mockMode
      };
      if (clientId) payload.client_id = clientId;
      if (clientSecret) payload.client_secret = clientSecret;
      if (redirectUri) payload.redirect_uri = redirectUri;

      await api.updateZohoSettings(payload);
      setSaveMessage('Zoho settings updated successfully');
      await onRefreshZohoStatus();
    } catch (err) {
      setSaveMessage('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectOAuth = async () => {
    try {
      const res = await api.getZohoAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      alert('Could not start OAuth flow: ' + err.message);
    }
  };

  const isConnected = zohoStatus?.config?.is_connected;
  const isMock = zohoStatus?.config?.mock_mode;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Zoho Books Integration & Sync Hub</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bi-directional journal synchronization, chart of accounts mapping, and project cost tracking
          </p>
        </div>

        {/* Sync Action Button */}
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing with Zoho...' : 'Trigger Full Sync Now'}</span>
        </button>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isConnected ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isConnected ? 'Zoho Books Connected' : 'Zoho Books Not Connected'}
                </h3>
                {isMock && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Sandbox / Mock Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {organizationName || 'Bright Flowers Trading LLC'} • Org ID: {organizationId || '789123456'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleConnectOAuth}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white shadow-xs transition flex items-center space-x-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isConnected ? 'Re-authorize Zoho OAuth 2.0' : 'Connect with Zoho Books'}</span>
            </button>
          </div>
        </div>

        {/* Sync Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Synced Accounts</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {zohoStatus?.counts?.accounts || 0} Accounts
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Synced Projects</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {zohoStatus?.counts?.projects || 0} Projects
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Scheduled Background Sync</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5 flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Every 15 min</span>
            </div>
          </div>
        </div>

        {/* Action alert if not authorized */}
        {!isConnected && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">OAuth Consent Required for Live Zoho Sync</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Your Client ID and Secret are configured, but an active Zoho Books authorization token is missing. Click <strong>"Connect with Zoho Books"</strong> to grant permissions.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectOAuth}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs shrink-0 transition"
            >
              Authorize Now
            </button>
          </div>
        )}
      </div>

      {/* Explorer Navigation Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('oauth')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'oauth'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>OAuth Credentials</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'accounts'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Chart of Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'projects'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Zoho Projects</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'logs'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Audit & Sync Logs</span>
        </button>
      </div>

      {/* Tab: OAuth & Credentials Settings */}
      {activeTab === 'oauth' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Zoho Books API Credentials</h3>
              <p className="text-xs text-slate-500">Configure your Zoho Developer Console Client ID and Secret</p>
            </div>

            {/* Sandbox Mock Switch */}
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={mockMode}
                onChange={(e) => setMockMode(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-bold">
                Simulation Sandbox Mode
              </span>
            </label>
          </div>

          {saveMessage && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
              {saveMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Zoho Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="1000.DEMOZOHOCLIENTID12345"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Zoho Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organization ID</label>
              <input
                type="text"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                placeholder="789123456"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Bright Flowers Trading LLC"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data Center (DC Region)</label>
              <select
                value={dcRegion}
                onChange={(e) => setDcRegion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="com">United States (.com)</option>
                <option value="in">India (.in)</option>
                <option value="eu">European Union (.eu)</option>
                <option value="com.au">Australia (.com.au)</option>
                <option value="jp">Japan (.jp)</option>
                <option value="ca">Canada (.ca)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Redirect URI</label>
            <input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Chart of Accounts */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Synced Chart of Accounts ({accounts.length})
            </h3>
            <span className="text-xs text-slate-400">Mapped for Journal Entry Debit & Credit</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Role in Petty Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <tr key={acc.account_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{acc.account_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{acc.account_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{acc.account_code || '—'}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        acc.account_type === 'expense' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {acc.account_type === 'expense'
                        ? 'Debit (Expense Account)'
                        : 'Credit (Employee Cash Float)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Projects */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Synced Zoho Projects ({projects.length})
            </h3>
            <span className="text-xs text-slate-400">Available for project-wise expense tagging</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Project ID</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((proj) => (
                  <tr key={proj.project_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{proj.project_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{proj.project_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{proj.project_code || '—'}</td>
                    <td className="py-3 px-4 text-slate-700">{proj.customer_name || 'Internal'}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        {proj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Sync & Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Audit & Synchronization Stream
            </h3>
            <span className="text-xs text-slate-400">Journal creation, token renewals, and webhook events</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {syncLogs.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No logs recorded yet.</p>
            ) : (
              syncLogs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50/80 transition flex items-start justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : log.status === 'failure'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-bold text-slate-800 font-mono">{log.sync_type}</span>
                    </div>
                    {log.details && (
                      <p className="text-slate-500 font-mono text-[11px] truncate max-w-md">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-red-600 font-semibold">{log.error_message}</p>
                    )}
                  </div>
                  <span className="text-slate-400 text-[10px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
