import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The route does not exist in the workbench.</p>
      <Link to="/" className="mt-6">
        <Button>Return to dashboard</Button>
      </Link>
    </div>
  );
}
