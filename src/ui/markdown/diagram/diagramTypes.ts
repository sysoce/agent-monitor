export type DiagramKind = 'mermaid' | 'chart';

export type ChartType = 'bar' | 'horizontal-bar' | 'line' | 'pie' | 'doughnut' | 'area';

export interface ChartDataset {
  label?: string;
  data: number[];
  color?: string;
  backgroundColor?: string;
}

export interface ChartSpec {
  type: ChartType;
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}

export type DiagramTheme = 'dark' | 'light' | 'forest' | 'neutral' | 'default';

export interface DiagramRenderResult {
  success: boolean;
  svg?: string;
  error?: string;
  diagramKind: DiagramKind;
}

export interface DiagramCardOptions {
  onCopy?: (code: string) => void;
  onOpenSource?: (code: string) => void;
}
