module.exports = {
  apps: [
    {
      name: 'vider-platform',
      script: 'dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      monitoring: false,
      
      // Advanced features
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Environment-specific settings
      node_args: '--max-old-space-size=2048'
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/vider-platform.git',
      path: '/var/www/vider-platform',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:production && npm run migrate:deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};