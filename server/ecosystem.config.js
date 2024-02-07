module.exports = {
  apps: [
    {
      name: 'server',  // Updated app name to nodeapp
      script: 'npm run dev',  // Updated script name to index.js
      // instances: 1,
      // autorestart: false,
      // watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000  // Replace with your desired port
      }
    }
  ]
};
