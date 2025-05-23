const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

function findAvailablePort(startPort = 3000, maxAttempts = 10) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      execSync(`wait-on tcp:${port} --timeout 1000`, { stdio: 'ignore' });
      console.log(`Port ${port} is occupied, trying ${port + 1}...`);
    } catch (error) {
      return port; // 端口未被占用
    }
  }
  throw new Error('No available port found');
}

const port = findAvailablePort();
console.log(`Starting server on port ${port}...`);
execSync(`cross-env PORT=${port} pnpm start`, { stdio: 'inherit' });