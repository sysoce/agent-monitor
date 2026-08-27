export interface CreateGistResult {
  gistId: string;
  htmlUrl?: string;
}

export async function createSecretGist(
  token: string,
  initialContent?: string,
  baseUrl = 'https://api.github.com'
): Promise<CreateGistResult> {
  const content =
    initialContent ||
    JSON.stringify({
      version: 1,
      sessions: [],
      inbox: [],
      updatedAt: Date.now(),
    });

  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/gists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(typeof window === 'undefined' ? { 'User-Agent': 'AgentMonitor-Setup' } : {}),
    },
    body: JSON.stringify({
      description: 'Agent Mobile Sync Vault (Encrypted)',
      public: false,
      files: {
        'agent-sync.json': { content },
      },
    }),
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err?.message) detail = `${res.status} (${err.message})`;
    } catch {}
    throw new Error(`Failed to create secret Gist: ${detail}`);
  }

  const data = (await res.json()) as { id?: string; html_url?: string };
  if (!data?.id) throw new Error('GitHub Gist creation returned no ID');
  return { gistId: data.id, htmlUrl: data.html_url };
}

export async function verifyGistAccess(
  token: string,
  gistId: string,
  baseUrl = 'https://api.github.com'
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(typeof window === 'undefined' ? { 'User-Agent': 'AgentMonitor-Setup' } : {}),
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
