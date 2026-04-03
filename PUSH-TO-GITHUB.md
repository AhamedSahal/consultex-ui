# Push Frontend to GitHub

This repo is ready to push to its own GitHub repository.

1. **Create a new repo on GitHub** (e.g. `hr-consulting-ai-ui`). Do **not** initialize with README.

2. **Add remote and push** (replace `YOUR_USERNAME` and repo name):

```bash
cd "d:\DATA\tuscan\consulting\cunsulting-agent-ui"
git remote add origin https://github.com/YOUR_USERNAME/hr-consulting-ai-ui.git
git branch -M main
git push -u origin main
```

After pushing, you can connect this repo to Vercel for automatic deployments.
