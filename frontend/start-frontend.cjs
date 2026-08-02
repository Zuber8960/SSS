const { spawn } = require('child_process');
const child = spawn('serve', ['-s', 'dist', '-l', '4000'], {
  shell: true,
  stdio: 'inherit'
});
child.on('error', (err) => console.error(err));
