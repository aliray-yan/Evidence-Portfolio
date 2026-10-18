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
      <h1 className="font-display text-3xl uppercase text-foreground">Health Check</h1>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">
          Application Status
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium text-primary">Operational</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Environment</dt>
            <dd className="text-foreground">{environment}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Timestamp</dt>
            <dd className="text-foreground">{timestamp}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">
          API Connectivity Test
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Endpoint</dt>
            <dd className="break-all text-right text-foreground">
              {HEALTH_CHECK_ENDPOINT}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd
              className={`font-medium ${
                apiResult.success ? "text-primary" : "text-destructive"
              }`}
            >
              {apiResult.success ? "Success" : "Failed"}
            </dd>
          </div>
        </dl>

        {apiResult.success && apiResult.data && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <p className="mb-2 text-xs text-muted-foreground">Response data</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">login</dt>
                <dd className="text-foreground">{apiResult.data.login}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">id</dt>
                <dd className="text-foreground">{apiResult.data.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">public_repos</dt>
                <dd className="text-foreground">
                  {apiResult.data.public_repos}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">created_at</dt>
                <dd className="text-foreground">{apiResult.data.created_at}</dd>
              </div>
            </dl>
          </div>
        )}

        {!apiResult.success && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-background p-4">
            <p className="text-sm text-destructive">
              {apiResult.error ?? "The health check request failed."}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">
          Server Component Verification
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This data was fetched server-side. No API key required.
        </p>
      </section>
    </div>
  );
}
