#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

function getSshOpts(args) {
  const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
  const socksPort = process.env.TOR_SOCKS_PORT || '9050';
  const knownHosts = path.join(process.env.HOME || '~', '.ssh', 'known_hosts_tor');
  
  const isOnion = args.some(arg => typeof arg === 'string' && /\.onion([:/]|$)/.test(arg));
  
  const opts = [
    '-o', `ProxyCommand=nc -x ${socksHost}:${socksPort} -X 5 %h %p`,
    '-o', `UserKnownHostsFile=${knownHosts}`,
  ];
  
  if (isOnion) {
    opts.push('-o', 'StrictHostKeyChecking=no');
    opts.push('-o', 'VerifyHostKeyDNS=no');
  } else {
    opts.push('-o', 'StrictHostKeyChecking=accept-new');
  }
  
  return opts;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: torsh <command> [args...]');
    console.log('');
    console.log('Runs any SSH-based command through Tor SOCKS5 proxy.');
    console.log('');
    console.log('Examples:');
    console.log('  torsh ssh user@host');
    console.log('  torsh scp file user@host:/path');
    console.log('  torsh rsync -avz dir/ user@host:dir/');
    console.log('  torsh git clone ssh://user@host/repo');
    console.log('  torsh sshfs user@host:/remote /local');
    console.log('  torsh mosh user@host');
    console.log('  torsh curl https://check.torproject.org');
    console.log('  torsh ping google.com');
    console.log('');
    console.log('Environment variables:');
    console.log('  TOR_SOCKS_PORT  - Tor SOCKS proxy port (default: 9050)');
    console.log('  TOR_SOCKS_HOST  - Tor SOCKS proxy host (default: 127.0.0.1)');
    process.exit(1);
  }
  
  const cmd = args[0];
  const rest = args.slice(1);
  const sshOpts = getSshOpts(args);
  const sshOptsStr = sshOpts.join(' ');
  
  let child;
  
  switch (cmd) {
    case 'ssh':
    case 'scp':
    case 'sftp':
    case 'ssh-copy-id':
      child = spawn(cmd, [...sshOpts, ...rest], { stdio: 'inherit' });
      break;
      
    case 'rsync':
      child = spawn('rsync', ['-e', `ssh ${sshOptsStr}`, ...rest], { stdio: 'inherit' });
      break;
      
    case 'sshfs':
      child = spawn('sshfs', ['-o', `ssh_command=ssh ${sshOptsStr}`, ...rest], { stdio: 'inherit' });
      break;
      
    case 'mosh':
      child = spawn('mosh', [`--ssh=ssh ${sshOptsStr}`, ...rest], { stdio: 'inherit' });
      break;
      
    case 'ansible':
    case 'ansible-playbook':
    case 'ansible-pull':
      child = spawn(cmd, rest, {
        stdio: 'inherit',
        env: { ...process.env, ANSIBLE_SSH_ARGS: sshOptsStr }
      });
      break;

    case 'curl':
    case 'torcurl': {
      const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
      const socksPort = process.env.TOR_SOCKS_PORT || '9050';
      child = spawn('curl', [
        '--proxy', `socks5h://${socksHost}:${socksPort}`,
        '--location',
        ...rest
      ], { stdio: 'inherit' });
      break;
    }

    case 'ping': {
      const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
      const socksPort = process.env.TOR_SOCKS_PORT || '9050';
      child = spawn('proxychains4', ['-q', '-f', `/dev/stdin`, 'ping', ...rest], {
        stdio: ['pipe', 'inherit', 'inherit'],
        env: { ...process.env }
      });
      if (child.stdin) {
        child.stdin.write(`strict_chain\nproxy_dns\ntcp_read_time_out 15000\ntcp_connect_time_out 8000\n[ProxyList]\nsocks5 ${socksHost} ${socksPort}\n`);
        child.stdin.end();
      }
      break;
    }

    case 'git':
      child = spawn('git', rest, {
        stdio: 'inherit',
        env: { ...process.env, GIT_SSH_COMMAND: `ssh ${sshOptsStr}` }
      });
      break;

    case 'info': {
      const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
      const socksPort = process.env.TOR_SOCKS_PORT || '9050';
      
      console.log('🧅 Tor Circuit Info');
      console.log('═══════════════════');
      console.log(`SOCKS Proxy: ${socksHost}:${socksPort}`);
      console.log('');
      
      // Check if Tor is running
      const net = require('net');
      const socket = net.createConnection({ host: socksHost, port: parseInt(socksPort) });
      socket.on('connect', () => {
        socket.end();
        console.log('✅ Tor SOCKS proxy: ONLINE');
        console.log('');
        
        // Use curl to check exit node (no external dep)
        const { spawn } = require('child_process');
        const curl = spawn('curl', [
          '--silent',
          '--proxy', `socks5h://${socksHost}:${socksPort}`,
          'https://check.torproject.org/api/ip'
        ], { stdio: ['ignore', 'pipe', 'pipe'] });
        
        let data = '';
        curl.stdout.on('data', chunk => data += chunk);
        curl.on('close', (code) => {
          if (code === 0) {
            try {
              const json = JSON.parse(data);
              console.log('Exit Node IP:', json.IP || 'unknown');
              console.log('Is Tor:', json.IsTor ? '✅ Yes' : '❌ No');
            } catch {
              console.log('Exit Node IP: (could not parse response)');
            }
          } else {
            console.log('Exit Node IP: (could not reach check endpoint)');
          }
          console.log('');
          console.log('To see full circuit details, use:');
          console.log('  nyx  (Tor monitor)');
          console.log('  or connect to Tor ControlPort');
          process.exit(0);
        });
      });
      socket.on('error', () => {
        console.log('❌ Tor SOCKS proxy: OFFLINE');
        console.log('');
        console.log('Start Tor with:');
        console.log('  brew services start tor    (macOS)');
        console.log('  sudo systemctl start tor   (Linux)');
        process.exit(1);
      });
      socket.setTimeout(3000, () => { socket.destroy(); });
      return;
    }
      
    default:
      child = spawn(cmd, rest, {
        stdio: 'inherit',
        env: { ...process.env, SSH_OPTIONS: sshOptsStr, GIT_SSH_COMMAND: `ssh ${sshOptsStr}` }
      });
  }
  
  child.on('exit', (code) => process.exit(code || 0));
}

main();
