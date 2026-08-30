export function buildPlanHandoffPrompt(planPath: string, planTitle?: string): string {
  const title = planTitle || planPath.split('/').pop() || 'Plan';
  const planRef = planPath ? ` [${title}](${planPath})` : '';
  return `I am ready to implement the plan${planRef}. Please follow each step in the plan, work through the checklist items in order, verify the changes, and produce a walkthrough.md artifact summarizing the changes made, verification results, and tested behavior.`;
}
