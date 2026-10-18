import Card from '../common/Card';

export default function UserManagement() {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">User Management</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Admins can manage users through the `/api/v1/users` endpoints. The seeded accounts cover admin, senior analyst, analyst, and viewer roles.</p>
    </Card>
  );
}
