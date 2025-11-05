# Quick Start Guide

This guide will get you up and running with the JS App Template in minutes.

## Create a New Project

```bash
# Clone the template
git clone <template-repo-url> my-app
cd my-app

# Remove the template's git history
rm -rf .git

# Initialize fresh git repository
git init
git add .
git commit -m "Initial commit"

# Install dependencies
npm install

# Start development
npm run dev
```

## Verify Everything Works

### 1. Run Tests

```bash
npm test
```

You should see all tests passing:

```
PASS  tests/calculator.test.ts
PASS  tests/useCounter.test.ts
PASS  tests/Button.test.tsx

Test Suites: 3 passed, 3 total
Tests:       23 passed, 23 total
```

### 2. Check Coverage

```bash
npm run test:coverage
```

You should see 100% coverage for the example code:

```
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
All files             |     100 |      100 |     100 |     100
 components/Button.tsx|     100 |      100 |     100 |     100
 hooks/useCounter.ts  |     100 |      100 |     100 |     100
 services/calculator.ts|     100 |      100 |     100 |     100
```

### 3. Build for Production

```bash
npm run build
```

Output should be in `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

Visit http://localhost:4173

## Next Steps

### Remove Example Code

```bash
# Delete example files
rm src/components/Button.tsx
rm src/services/calculator.ts
rm src/hooks/useCounter.ts
rm tests/Button.test.tsx
rm tests/calculator.test.ts
rm tests/useCounter.test.ts

# Create your own components
touch src/components/MyComponent.tsx
touch tests/MyComponent.test.tsx
```

### Update App.tsx

Replace the content with your application logic.

### Configure GitHub Actions

1. Push your repository to GitHub
2. GitHub Actions will automatically run tests on every push
3. Configure branch protection to require passing tests before merging

### Add Your Remote

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run build` | Build for production |
| `npm run type-check` | Check TypeScript types |

## File Structure

```
my-app/
├── src/               # Your application code
│   ├── components/    # React components
│   ├── services/      # Business logic
│   ├── hooks/         # Custom hooks
│   └── App.tsx        # Main app component
├── tests/             # All test files
├── public/            # Static assets
└── dist/              # Build output (generated)
```

## Tips

1. **Test as you code**: Run `npm run test:watch` in a separate terminal
2. **Use path aliases**: Import with `@/src/...` instead of relative paths
3. **Type-check before committing**: Run `npm run type-check`
4. **Keep coverage high**: The template enforces 80%+ coverage
5. **Follow the examples**: The included tests show best practices

## Troubleshooting

### Port 3000 already in use

```bash
# Change port in vite.config.ts
server: {
  port: 3001,  // Use different port
}
```

### Tests failing after install

```bash
# Clear caches and reinstall
rm -rf node_modules coverage
npm install
npm test
```

### Type errors

```bash
# Run type checker to see all errors
npm run type-check
```

## Need Help?

- Read the full [README.md](README.md) for detailed documentation
- Check the example tests for testing patterns
- Review configuration files for customization options

Happy coding!
