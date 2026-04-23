module.exports = {
  apps: [
    {
      name: "whatsapp-bot-loja",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production" },
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      merge_logs: true,
      time: true
    }
  ]
};
