# 🚀 Deployment & Auto-Versioning Guide

This project uses **automatic versioning and publishing** based on commit messages. Here's how it works:

## 📝 Commit Message Rules

Your commit message determines what happens:

### 🐛 **Patch Version** (1.0.0 → 1.0.1)
```bash
git commit -m "fix: memory leak in vAction"
git commit -m "bug: handle edge case in makeObservable"  
git commit -m "patch: improve error handling"
```

### ✨ **Minor Version** (1.0.0 → 1.1.0)
```bash
git commit -m "feat: add new useAsync hook"
git commit -m "feature: support for Map reactivity"
```

### 💥 **Major Version** (1.0.0 → 2.0.0)
```bash
git commit -m "BREAKING: change useVstate API"
git commit -m "breaking: remove deprecated methods"
git commit -m "feat: new API [breaking]"
```

### ⏭️ **Skip Publishing** (no version change)
```bash
git commit -m "docs: update README [skip]"
git commit -m "style: fix formatting"
git commit -m "refactor: clean up code"
git commit -m "test: add unit tests"
git commit -m "chore: update dependencies"
```

## 🔄 Auto-Publishing Workflow

1. **Push to main branch**
2. **GitHub Actions runs:**
   - ✅ Type checking (`npm run type-check`)
   - ✅ Linting (`npm run lint`) 
   - ✅ Build (`npm run build`)
   - ✅ Size check (`npm run size`)
3. **Analyzes commit message**
4. **Auto-bumps version** in package.json
5. **Creates git tag** (e.g., v1.2.3)
6. **Publishes to npm** 🎉

## 🎯 Examples

### Publishing a Bug Fix
```bash
git add .
git commit -m "fix: resolve infinite loop in computed getters"
git push origin main
# → Publishes v1.0.1 automatically
```

### Adding a New Feature
```bash
git add .
git commit -m "feat: add useVref hook for mutable refs"
git push origin main  
# → Publishes v1.1.0 automatically
```

### Breaking Changes
```bash
git add .
git commit -m "BREAKING: rename useVlocal to useVstate"
git push origin main
# → Publishes v2.0.0 automatically
```

### Documentation Changes (No Publish)
```bash
git add .
git commit -m "docs: improve README examples [skip]"
git push origin main
# → No version bump, no publish
```

## 🛠️ Manual Override

If you need to manually control versioning:

```bash
# Bump version manually
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0  
npm version major   # 1.0.0 → 2.0.0

# Then commit and push
git push origin main --tags
# → Will publish the manually set version
```

## 🔧 Setup Requirements

1. **GitHub Secrets needed:**
   - `NPM_TOKEN` - Your npm automation token

2. **File location:**
   - `.github/workflows/smart-publish.yml`

## 📊 What Gets Published

- ✅ `dist/` folder (built files)
- ✅ `README.md` 
- ✅ `LICENSE`
- ❌ Source files (`src/`)
- ❌ Config files
- ❌ Tests

## 🚨 Important Notes

- **Only pushes to `main` branch trigger publishing**
- **Pull requests only run tests** (no publishing)
- **Failed tests = no publishing**
- **Each push can only publish once** (no duplicate versions)

## 🎯 Best Practices

1. **Use descriptive commit messages**
2. **Group related changes in one commit**
3. **Use `[skip]` for non-code changes**
4. **Test locally before pushing**
5. **Check the Actions tab** to see publish status

---

**Need help?** Check the GitHub Actions logs in the "Actions" tab of the repo.