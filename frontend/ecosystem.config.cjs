module.exports = {
  apps: [
    {
      name: "frontend",
      script: "node_modules/.bin/serve",
      args: "-s dist -l 4000",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
