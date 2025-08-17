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

### For All Pushes & Pull Requests:
1. **Continuous Integration runs:**
   - ✅ Type checking (`npm run type-check`)
   - ✅ **Tests with coverage** (`npm run test:ci`)
   - ✅ Build verification (`npm run build`)

### For Pushes to Main Branch Only:
2. **After CI passes, Publishing runs:**
   - 🔍 **Analyzes commit message**
   - 📈 **Auto-bumps version** in package.json
   - 🏷️ **Creates git tag** (e.g., v1.2.3)
   - 📦 **Publishes to npm** 🎉

## 🧪 Testing & Coverage

### Local Development
```bash
# Run tests once
npm test

# Run tests in watch mode  
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

### Coverage Requirements
Your tests must maintain:
- **70%** branch coverage
- **75%** function coverage  
- **75%** line coverage
- **75%** statement coverage

**If coverage drops below these thresholds, publishing will fail!**

## 🎯 Examples

### Publishing a Bug Fix
```bash
git add .
git commit -m "fix: resolve infinite loop in computed getters"
git push origin main
# → Runs tests → If pass → Publishes v1.0.1 automatically
```

### Adding a New Feature
```bash
git add .
git commit -m "feat: add useVref hook for mutable refs"
git push origin main  
# → Runs tests → If pass → Publishes v1.1.0 automatically
```

### Breaking Changes
```bash
git add .
git commit -m "BREAKING: rename useVlocal to useVstate"
git push origin main
# → Runs tests → If pass → Publishes v2.0.0 automatically
```

### Documentation Changes (No Publish)
```bash
git add .
git commit -m "docs: improve README examples [skip]"
git push origin main
# → Runs tests only, no version bump, no publish
```

### Pull Request Workflow
```bash
git checkout -b feature/new-hook
git add .
git commit -m "feat: add useComputed hook"
git push origin feature/new-hook
# → Opens PR → Runs tests only (no publishing)
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
   - `.github/workflows/publish.yml`

## 📊 What Gets Published

- ✅ `dist/` folder (built files)
- ✅ `README.md` 
- ✅ `LICENSE`
- ❌ Source files (`src/`)
- ❌ Config files
- ❌ Tests
- ❌ Coverage reports

## 🚨 Important Notes

- **Only pushes to `main` branch trigger publishing**
- **Pull requests only run tests** (no publishing)
- **Failed tests = no publishing** ❌
- **Low coverage = no publishing** ❌
- **Each push can only publish once** (no duplicate versions)
- **Tests run on both PR and main pushes**

## 🎯 Best Practices

1. **Write tests for new features** - Coverage requirements enforced!
2. **Use descriptive commit messages**
3. **Group related changes in one commit**
4. **Use `[skip]` for non-code changes**
5. **Test locally before pushing** (`npm run test:coverage`)
6. **Check the Actions tab** to see publish status
7. **Keep coverage above thresholds** (10%+ branches, 20%+ functions/lines/statements)

## 🐛 Troubleshooting

### Tests Failing?
```bash
# Run locally to debug
npm run test:coverage
# Check which tests are failing and fix them
```

### Coverage Too Low?
```bash
# See detailed coverage report
npm run test:coverage
open coverage/lcov-report/index.html
# Add tests for uncovered code
```

### Build Failing?
```bash
# Check TypeScript errors
npm run type-check
# Fix type issues
```

---

**Need help?** Check the GitHub Actions logs in the "Actions" tab of the repo.