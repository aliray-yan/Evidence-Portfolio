import { useState } from 'react';
import Button from '../common/Button';
import Textarea from '../common/Textarea';

export default function BulkEnrichment({ onBulk, isLoading }) {
  const [text, setText] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onBulk(text.split(/\s|,|\n/).map((item) => item.trim()).filter(Boolean));
      }}
    >
      <Textarea label="Bulk IOCs" placeholder="Paste one IOC per line or comma-separated" value={text} onChange={(event) => setText(event.target.value)} />
      <Button type="submit" variant="secondary" isLoading={isLoading}>
        Enrich bulk list
      </Button>
    </form>
  );
}
