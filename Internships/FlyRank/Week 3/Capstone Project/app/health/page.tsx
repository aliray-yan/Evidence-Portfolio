interface GitHubUser {
  login: string;
  id: number;
  public_repos: number;
  created_at: string;
}

interface ApiResult {
  success: boolean;
  data?: GitHubUser;
  error?: string;
}

const HEALTH_CHECK_ENDPOINT = "https://api.github.com/users/github";

async function fetchApiHealth(): Promise<ApiResult> {
  try {
    const response = await fetch(HEALTH_CHECK_ENDPOINT, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { success: false, error: `Request failed with status ${response.status}` };
    }

    const data = (await response.json()) as GitHubUser;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

export default async function HealthCheckPage() {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV ?? "development";
  const apiResult = await fetchApiHealth();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100">Health Check</h1>

      <section className="mt-10 rounded-lg border border-navy-800 bg-navy-800 p-6">
        <h2 className="font-mono text-sm text-cyan-400">
          Application Status
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Status</dt>
            <dd className="font-medium text-cyan-400">Operational</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Environment</dt>
            <dd className="text-slate-100">{environment}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Timestamp</dt>
            <dd className="text-slate-100">{timestamp}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-navy-800 bg-navy-800 p-6">
        <h2 className="font-mono text-sm text-cyan-400">
          API Connectivity Test
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Endpoint</dt>
            <dd className="break-all text-right text-slate-100">
              {HEALTH_CHECK_ENDPOINT}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Status</dt>
            <dd
              className={`font-medium ${
                apiResult.success ? "text-cyan-400" : "text-coral-500"
              }`}
            >
              {apiResult.success ? "Success" : "Failed"}
            </dd>
          </div>
        </dl>

        {apiResult.success && apiResult.data && (
          <div className="mt-4 rounded border border-navy-800 bg-navy-950 p-4">
            <p className="mb-2 text-xs text-slate-400">Response data</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">login</dt>
                <dd className="text-slate-100">{apiResult.data.login}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">id</dt>
                <dd className="text-slate-100">{apiResult.data.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">public_repos</dt>
                <dd className="text-slate-100">
                  {apiResult.data.public_repos}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">created_at</dt>
                <dd className="text-slate-100">{apiResult.data.created_at}</dd>
              </div>
            </dl>
          </div>
        )}

        {!apiResult.success && (
          <div className="mt-4 rounded border border-coral-500/30 bg-navy-950 p-4">
            <p className="text-sm text-coral-500">
              {apiResult.error ?? "The health check request failed."}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-navy-800 bg-navy-800 p-6">
        <h2 className="font-mono text-sm text-cyan-400">
          Server Component Verification
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          This data was fetched server-side. No API key required.
        </p>
      </section>
    </div>
  );
}
