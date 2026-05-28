# torssh-cli

SSH, SCP, SFTP and more over Tor SOCKS5 proxy. Works with both clearnet IPs and `.onion` hidden services.

## Install

```bash
npm install -g torssh-cli
```

Or with pnpm:
```bash
pnpm add -g torssh-cli
```

## Requirements

- Node.js >= 14
- `nc` (netcat) with SOCKS support — built-in on macOS and most Linux distros
- Tor running with SOCKS proxy (default: `127.0.0.1:9050`)

## Usage

### SSH over Tor
```bash
torssh user@xxx.xxx.xxx.xxx
torssh user@abc123xyz.onion
torssh user@host:2222
```

### SCP over Tor
```bash
torscp file.txt user@host:/path/
torscp -r dir/ user@host:/remote/dir/
```

### SFTP over Tor
```bash
torsftp user@host
torsftp user@host:2222
```

### Copy SSH key over Tor
```bash
torssh-copy-id user@host
```

### Universal wrapper (rsync, git, sshfs, mosh, ansible, etc.)
```bash
torsh ssh user@host
torsh scp file user@host:/path
torsh rsync -avz dir/ user@host:dir/
torsh git clone ssh://user@host/repo
torsh sshfs user@host:/remote /local
torsh mosh user@host
torsh ansible-playbook site.yml
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TOR_SOCKS_HOST` | `127.0.0.1` | Tor SOCKS proxy host |
| `TOR_SOCKS_PORT` | `9050` | Tor SOCKS proxy port (use `9150` for Tor Browser) |

## .onion Support

`.onion` addresses are auto-detected. For hidden services:
- `StrictHostKeyChecking` is disabled (hidden services have ephemeral keys)
- `VerifyHostKeyDNS` is disabled (prevents DNS leaks)
- Separate `known_hosts_tor` file is used

## License

MIT
