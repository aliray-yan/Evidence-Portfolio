import { Search } from 'lucide-react';
import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

export default function IOCLookup({ onLookup, isLoading }) {
  const [ioc, setIoc] = useState('');
  const [type, setType] = useState('');
  return (
    <form
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_180px_140px]"
      onSubmit={(event) => {
        event.preventDefault();
        onLookup({ ioc, type: type || undefined });
      }}
    >
      <Input placeholder="IP, domain, URL, hash, email, or CVE" value={ioc} onChange={(event) => setIoc(event.target.value)} required />
      <Select
        value={type}
        onChange={(event) => setType(event.target.value)}
        options={[
          { value: '', label: 'Auto-detect' },
          'ip',
          'domain',
          'url',
          'hash_md5',
          'hash_sha1',
          'hash_sha256',
          'email',
          'cve'
        ]}
      />
      <Button icon={Search} isLoading={isLoading}>
        Lookup
      </Button>
    </form>
  );
}
