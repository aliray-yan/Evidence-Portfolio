import { KeyRound, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';

const PROVIDER_LABELS = {
  virustotal: 'VirusTotal',
  abuseipdb: 'AbuseIPDB',
  alienvault_otx: 'AlienVault OTX',
  greynoise: 'GreyNoise',
  shodan: 'Shodan',
  edr_ingest: 'EDR Ingest',
  urlhaus: 'URLhaus',
  malwarebazaar: 'MalwareBazaar'
};

export default function APIConfiguration({ keys = {}, envPath, onSave, isSaving }) {
  const editableProviders = useMemo(
    () => Object.entries(keys).filter(([, provider]) => provider.requires_key),
    [keys]
  );
  const freeProviders = useMemo(
    () => Object.entries(keys).filter(([, provider]) => !provider.requires_key),
    [keys]
  );
  const [form, setForm] = useState({});

  const update = (provider, value) => setForm((state) => ({ ...state, [provider]: value }));

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">API Configuration</h2>
          {envPath ? <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{envPath}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
          <KeyRound className="h-5 w-5" />
        </div>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {editableProviders.map(([name, provider]) => (
            <Input
              key={name}
              label={PROVIDER_LABELS[name] || name}
              value={form[name] || ''}
              placeholder={provider.configured ? `${provider.env_var} is set (${provider.masked})` : provider.env_var}
              onChange={(event) => update(name, event.target.value)}
              autoComplete="off"
            />
          ))}
        </div>
        <Button icon={Save} isLoading={isSaving} type="submit">
          Save API keys
        </Button>
      </form>

      {freeProviders.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {freeProviders.map(([name]) => (
            <div key={name} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <span className="font-medium text-slate-700 dark:text-slate-200">{PROVIDER_LABELS[name] || name}</span>
              <span className="text-green-600 dark:text-green-300">No key required</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
