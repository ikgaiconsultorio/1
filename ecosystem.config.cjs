module.exports = {
  apps: [{
    name: 'pescavena',
    script: './server/index.js',
    cwd: __dirname,
    watch: false,
    max_memory_restart: '150M'
  }]
};
