#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

function getSshOpts(host) {
  const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
  const socksPort = process.env.TOR_SOCKS_PORT || '9050';
  const knownHosts = path.join(process.env.HOME || '~', '.ssh', 'known_hosts_tor');
  const isOnion = /\.onion$/.test(host);
  
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

function parseTarget(target) {
  let user = '';
  let hostPort = target;
  
  const atIdx = target.indexOf('@');
  if (atIdx !== -1) {
    user = target.slice(0, atIdx);
    hostPort = target.slice(atIdx + 1);
  }
  
  let host = hostPort;
  let port = '';
  
  if (hostPort.startsWith('[')) {
    const closeIdx = hostPort.indexOf(']');
    if (closeIdx !== -1) {
      host = hostPort.slice(0, closeIdx + 1);
      const rest = hostPort.slice(closeIdx + 1);
      if (rest.startsWith(':')) port = rest.slice(1);
    }
  } else {
    const colonIdx = hostPort.lastIndexOf(':');
    if (colonIdx !== -1 && hostPort.indexOf(':') === colonIdx) {
      host = hostPort.slice(0, colonIdx);
      port = hostPort.slice(colonIdx + 1);
    }
  }
  
  return { user, host, port };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: torsftp [user@]host[:port]');
    console.log('');
    console.log('Environment variables:');
    console.log('  TOR_SOCKS_PORT  - Tor SOCKS proxy port (default: 9050)');
    console.log('  TOR_SOCKS_HOST  - Tor SOCKS proxy host (default: 127.0.0.1)');
    process.exit(1);
  }
  
  const target = args[0];
  const rest = args.slice(1);
  const { user, host, port } = parseTarget(target);
  
  const sftpArgs = getSshOpts(host);
  
  if (port) {
    sftpArgs.push('-P', port);
  }
  
  if (user) {
    sftpArgs.push(`${user}@${host}`);
  } else {
    sftpArgs.push(host);
  }
  
  sftpArgs.push(...rest);
  
  const child = spawn('sftp', sftpArgs, { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code || 0));
}

main();
