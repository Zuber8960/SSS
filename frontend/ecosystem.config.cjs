module.exports = {
  apps: [
    {
      name: "frontend",
      script: "start-frontend.cjs",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
