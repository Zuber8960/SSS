module.exports = {
  apps: [
    {
      name: "frontend",
      script: "serve",
      interpreter: "none",
      args: "-s dist -l 4000",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
