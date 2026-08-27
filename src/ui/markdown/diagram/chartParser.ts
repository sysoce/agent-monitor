import type { ChartSpec, ChartType, ChartDataset } from './diagramTypes';

export function parseChartSpec(raw: string, langHint: string = 'chart'): ChartSpec {
  const trimmed = raw.trim();
  const defaultType = inferChartTypeFromLang(langHint);

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeJsonSpec(parsed, defaultType);
    } catch {}
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const isKv = lines.some((l) => /^(?:type|title|labels?|categories|data|values|x|y)\s*:/i.test(l));
  if (!isKv && lines.length > 1 && lines[0].includes(',')) {
    const csvSpec = parseCsvChart(lines, defaultType);
    if (csvSpec) return csvSpec;
  }

  return parseKeyValueChart(lines, defaultType);
}

function inferChartTypeFromLang(lang: string): ChartType {
  const l = (lang || '').toLowerCase();
  if (l.includes('pie')) return 'pie';
  if (l.includes('doughnut') || l.includes('donut')) return 'doughnut';
  if (l.includes('line') || l.includes('area')) return 'line';
  if (l.includes('horizontal')) return 'horizontal-bar';
  return 'bar';
}

function normalizeJsonSpec(obj: any, fallbackType: ChartType): ChartSpec {
  const type: ChartType = (obj.type || fallbackType || 'bar').toLowerCase();
  const title = typeof obj.title === 'string' ? obj.title : undefined;
  const labels: string[] = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  let datasets: ChartDataset[] = [];

  if (Array.isArray(obj.datasets)) {
    datasets = obj.datasets.map((ds: any) => ({
      label: ds.label,
      data: Array.isArray(ds.data) ? ds.data.map(Number) : [],
      color: ds.color,
      backgroundColor: ds.backgroundColor,
    }));
  } else if (Array.isArray(obj.data)) {
    datasets = [{ data: obj.data.map(Number), label: obj.datasetLabel }];
  }

  return { type, title, labels, datasets };
}

function parseCsvChart(lines: string[], defaultType: ChartType): ChartSpec | null {
  const header = lines[0].split(',').map((h) => h.trim());
  if (header.length < 2) return null;

  const labels: string[] = [];
  const data: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      labels.push(parts[0]);
      data.push(Number(parts[1]) || 0);
    }
  }

  if (labels.length === 0) return null;
  return {
    type: defaultType,
    title: header[1] || undefined,
    labels,
    datasets: [{ label: header[1], data }],
  };
}

function parseKeyValueChart(lines: string[], defaultType: ChartType): ChartSpec {
  let type: ChartType = defaultType;
  let title: string | undefined;
  let labels: string[] = [];
  const datasets: ChartDataset[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();

    if (key === 'type') type = (val.toLowerCase() as ChartType) || defaultType;
    else if (key === 'title') title = val.replace(/^["']|["']$/g, '');
    else if (key === 'labels' || key === 'categories' || key === 'x') {
      labels = val.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    } else if (key === 'data' || key === 'values' || key === 'y') {
      const numbers = val.split(',').map((s) => Number(s.trim()) || 0);
      datasets.push({ data: numbers });
    }
  }

  return { type, title, labels, datasets };
}
