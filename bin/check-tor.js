#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const os = require('os');
const path = require('path');

function isTorRunning() {
  return new Promise((resolve) => {
    const socksHost = process.env.TOR_SOCKS_HOST || '127.0.0.1';
    const socksPort = process.env.TOR_SOCKS_PORT || '9050';
    const socket = require('net').createConnection({ host: socksHost, port: parseInt(socksPort) });
    socket.on('connect', () => { socket.end(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.setTimeout(2000, () => { socket.destroy(); resolve(false); });
  });
}

function isBrewInstalled() {
  try {
    execSync('which brew', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isAptAvailable() {
  try {
    execSync('which apt', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function installTor() {
  const platform = os.platform();
  if (platform === 'darwin' && isBrewInstalled()) {
    console.log('🔧 Installing Tor via Homebrew...');
    try {
      execSync('brew install tor', { stdio: 'inherit' });
      console.log('🚀 Starting Tor service...');
      execSync('brew services start tor', { stdio: 'inherit' });
      return true;
    } catch (e) {
      console.error('❌ Failed to install Tor via Homebrew.');
      return false;
    }
  } else if (platform === 'linux' && isAptAvailable()) {
    console.log('🔧 Installing Tor via apt...');
    try {
      execSync('sudo apt install -y tor', { stdio: 'inherit' });
      console.log('🚀 Starting Tor service...');
      execSync('sudo systemctl start tor', { stdio: 'inherit' });
      return true;
    } catch (e) {
      console.error('❌ Failed to install Tor via apt.');
      return false;
    }
  }
  return false;
}

async function main() {
  const running = await isTorRunning();
  if (running) {
    console.log('✅ Tor SOCKS proxy is already running.');
    process.exit(0);
  }

  console.log('⚠️  Tor SOCKS proxy not detected on default port (9050).');
  const installed = installTor();

  if (!installed) {
    console.error('\n❌ Could not auto-install Tor. Please install it manually:');
    console.error('   macOS: brew install tor && brew services start tor');
    console.error('   Linux: sudo apt install tor && sudo systemctl start tor');
    process.exit(1);
  }

  // Wait a moment for Tor to start
  console.log('⏳ Waiting for Tor to start...');
  await new Promise(r => setTimeout(r, 3000));

  const nowRunning = await isTorRunning();
  if (nowRunning) {
    console.log('✅ Tor is now running!');
    process.exit(0);
  } else {
    console.error('❌ Tor installed but SOCKS proxy not responding. Check your Tor config.');
    process.exit(1);
  }
}

main();
