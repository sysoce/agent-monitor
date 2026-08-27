import * as path from 'node:path';
import { startMonitorServer } from './server/server';
import { runSetupWizard } from './setup/setupWizard';
import { exportStandaloneBundle } from './setup/standaloneExporter';

function printHelp(): void {
  console.log(`
agent-monitor - Mobile-first PWA and live monitoring dashboard for autonomous AI coding agents

Usage:
  agent-monitor [command] [options]

Commands:
  start          Start the monitor HTTP & SSE server (default)
  setup          Run interactive setup wizard for Gist sync and mobile pairing
  export         Export zero-dependency standalone.html bundle
  tunnel         Start server and expose via public tunnel

Options:
  -p, --port <number>      Port to listen on (default: 4200)
  -h, --host <string>      Host address to bind (default: 0.0.0.0)
  -d, --dir, --workspace   Workspace directory root (default: current directory)
  -t, --tunnel             Enable public tunnel
  -P, --password <string>  Set PIN / password authentication
  --no-auth                Disable authentication checks
  --help                   Display this help message
  --version                Display version
`);
}

async function main() {
  const args = process.argv.slice(2);
  let port = Number(process.env.PORT) || 4200;
  let host = '0.0.0.0';
  let dir = process.cwd();
  let tunnel = false;
  let password = process.env.MONITOR_PASSWORD;
  let requireAuth: boolean | undefined;
  let setup = false;
  let exportOnly = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === 'start') continue;
    if (a === 'setup' || a === '--setup' || a === '-s') setup = true;
    else if (a === 'export' || a === '--export' || a === '-e') exportOnly = true;
    else if (a === 'tunnel' || a === '--tunnel' || a === '-t') tunnel = true;
    else if (a === '--help') { printHelp(); return; }
    else if (a === '--version' || a === '-v') {
      console.log('agent-monitor v1.0.0');
      return;
    }
    else if ((a === '--port' || a === '-p') && args[i + 1]) port = Number(args[++i]);
    else if ((a === '--host' || a === '-h') && args[i + 1]) host = args[++i]!;
    else if ((a === '--dir' || a === '-d' || a === '--workspace') && args[i + 1]) dir = path.resolve(args[++i]!);
    else if ((a === '--password' || a === '-P') && args[i + 1]) { password = args[++i]!; requireAuth = true; }
    else if (a === '--no-auth') requireAuth = false;
  }

  if (exportOnly) {
    console.log('📦 Exporting standalone monitor bundle...');
    const out = await exportStandaloneBundle(dir);
    console.log(`✅ Standalone bundle exported to: ${out}`);
    return;
  }

  if (setup) {
    const res = await runSetupWizard({ workspaceRoot: dir, port, password });
    console.log('\n======================================================');
    console.log(' 📱  Agent Mobile Monitor Setup Complete!');
    console.log('======================================================');
    console.log(` ▸ Gist Vault ID: ${res.config.gistId}`);
    console.log(` ▸ Mobile Setup URL:\n   ${res.mobileUrl}\n`);
    console.log(' Scan this QR code with your phone camera to connect:');
    console.log(res.qrTerminal);
    console.log('------------------------------------------------------');
    console.log(' 💡 Tip: In Safari/Chrome, tap "Add to Home Screen" to install.');
    console.log('======================================================\n');
    return;
  }

  startMonitorServer({ port, host, workspaceRoot: dir, tunnel, password, requireAuth });
}

void main();
