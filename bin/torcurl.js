#!/usr/bin/env node
const { spawn } = require('child_process');

function getCurlArgs() {
  const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
  const socksPort = process.env.TOR_SOCKS_PORT || '9050';
  return [
    '--proxy', `socks5h://${socksHost}:${socksPort}`,
    '--location',
  ];
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: torcurl [curl-options] <url>');
    console.log('');
    console.log('Runs curl through Tor SOCKS5 proxy.');
    console.log('');
    console.log('Examples:');
    console.log('  torcurl https://check.torproject.org');
    console.log('  torcurl -O https://example.com/file.zip');
    console.log('  torcurl -H "Authorization: Bearer token" https://api.example.com/data');
    console.log('');
    console.log('Environment variables:');
    console.log('  TOR_SOCKS_PORT  - Tor SOCKS proxy port (default: 9050)');
    console.log('  TOR_SOCKS_HOST  - Tor SOCKS proxy host (default: 127.0.0.1)');
    process.exit(1);
  }

  const curlArgs = [...getCurlArgs(), ...args];
  const child = spawn('curl', curlArgs, { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code || 0));
}

main();
