#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

function getSshOpts(args) {
  const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
  const socksPort = process.env.TOR_SOCKS_PORT || '9050';
  const knownHosts = path.join(process.env.HOME || '~', '.ssh', 'known_hosts_tor');
  
  const isOnion = args.some(arg => /\.onion([:/]|$)/.test(arg));
  
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
    console.log('Usage: torssh-copy-id [options] [user@]host');
    console.log('');
    console.log('Environment variables:');
    console.log('  TOR_SOCKS_PORT  - Tor SOCKS proxy port (default: 9050)');
    console.log('  TOR_SOCKS_HOST  - Tor SOCKS proxy host (default: 127.0.0.1)');
    process.exit(1);
  }
  
  const sshOpts = getSshOpts(args);
  const child = spawn('ssh-copy-id', [...sshOpts, ...args], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code || 0));
}

main();
