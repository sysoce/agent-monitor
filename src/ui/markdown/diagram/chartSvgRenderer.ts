import type { ChartSpec, ChartDataset } from './diagramTypes';

const PALETTE = ['#388bfd', '#2ea043', '#f0883e', '#a371f7', '#db61a2', '#79c0ff', '#56d364'];

export function renderChartToSvg(spec: ChartSpec): string {
  const width = 560;
  const height = 280;
  const titleSvg = spec.title ? `<text x="${width / 2}" y="24" text-anchor="middle" class="chart-title" fill="currentColor" font-size="14" font-weight="600">${escapeXml(spec.title)}</text>` : '';
  const topPad = spec.title ? 40 : 20;

  let contentSvg = '';
  if (spec.type === 'pie' || spec.type === 'doughnut') {
    contentSvg = renderPieChart(spec, width, height, topPad);
  } else if (spec.type === 'line' || spec.type === 'area') {
    contentSvg = renderLineChart(spec, width, height, topPad);
  } else {
    contentSvg = renderBarChart(spec, width, height, topPad);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="chart-svg" style="width:100%;max-width:${width}px;height:auto;display:block;margin:0 auto;font-family:inherit;">${titleSvg}${contentSvg}</svg>`;
}

function renderBarChart(spec: ChartSpec, w: number, h: number, top: number): string {
  const pad = { left: 50, right: 20, top, bottom: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const data = spec.datasets[0]?.data || [];
  const maxVal = Math.max(...data, 1);
  const barWidth = Math.min(plotW / (data.length || 1) * 0.65, 48);
  const gap = plotW / (data.length || 1);

  let svg = `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${w - pad.right}" y2="${pad.top + plotH}" stroke="currentColor" stroke-opacity="0.2"/>`;

  data.forEach((val, i) => {
    const barH = (val / maxVal) * plotH;
    const x = pad.left + i * gap + (gap - barWidth) / 2;
    const y = pad.top + plotH - barH;
    const color = spec.datasets[0]?.color || PALETTE[i % PALETTE.length];
    const lbl = spec.labels[i] || '';

    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" fill="${color}" fill-opacity="0.85"><title>${escapeXml(lbl)}: ${val}</title></rect>`;
    svg += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" fill="currentColor" font-size="11" opacity="0.8">${val}</text>`;
    svg += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(pad.top + plotH + 16).toFixed(1)}" text-anchor="middle" fill="currentColor" font-size="11" opacity="0.75">${escapeXml(lbl)}</text>`;
  });
  return svg;
}

function renderLineChart(spec: ChartSpec, w: number, h: number, top: number): string {
  const pad = { left: 50, right: 20, top, bottom: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const data = spec.datasets[0]?.data || [];
  const maxVal = Math.max(...data, 1);
  const gap = data.length > 1 ? plotW / (data.length - 1) : plotW;

  const points = data.map((val, i) => {
    const x = pad.left + i * gap;
    const y = pad.top + plotH - (val / maxVal) * plotH;
    return { x, y, val, lbl: spec.labels[i] || '' };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const color = spec.datasets[0]?.color || PALETTE[0];

  let svg = `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${w - pad.right}" y2="${pad.top + plotH}" stroke="currentColor" stroke-opacity="0.2"/>`;
  svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  points.forEach((p) => {
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}"><title>${escapeXml(p.lbl)}: ${p.val}</title></circle>`;
    svg += `<text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" fill="currentColor" font-size="11" opacity="0.8">${p.val}</text>`;
    svg += `<text x="${p.x.toFixed(1)}" y="${(pad.top + plotH + 16).toFixed(1)}" text-anchor="middle" fill="currentColor" font-size="11" opacity="0.75">${escapeXml(p.lbl)}</text>`;
  });
  return svg;
}

function renderPieChart(spec: ChartSpec, w: number, h: number, top: number): string {
  const cx = w * 0.4;
  const cy = top + (h - top) * 0.48;
  const r = Math.min(w * 0.3, (h - top) * 0.42);
  const innerR = spec.type === 'doughnut' ? r * 0.55 : 0;
  const data = spec.datasets[0]?.data || [];
  const total = data.reduce((a, b) => a + b, 0) || 1;

  let startAngle = -Math.PI / 2;
  let svg = '';
  let legendSvg = `<g transform="translate(${w * 0.72}, ${top + 10})">`;

  data.forEach((val, i) => {
    const sliceAngle = (val / total) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const color = PALETTE[i % PALETTE.length];
    const lbl = spec.labels[i] || `Item ${i + 1}`;
    const pct = ((val / total) * 100).toFixed(0);

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    let pathD = '';
    if (innerR > 0) {
      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);
      pathD = `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix1.toFixed(1)} ${iy1.toFixed(1)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)} Z`;
    } else {
      pathD = `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
    }

    svg += `<path d="${pathD}" fill="${color}" fill-opacity="0.88"><title>${escapeXml(lbl)}: ${val} (${pct}%)</title></path>`;
    legendSvg += `<rect x="0" y="${i * 20}" width="10" height="10" rx="2" fill="${color}"/><text x="16" y="${i * 20 + 9}" fill="currentColor" font-size="11" opacity="0.85">${escapeXml(lbl)} (${pct}%)</text>`;
    startAngle = endAngle;
  });

  legendSvg += '</g>';
  return svg + legendSvg;
}

function escapeXml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
