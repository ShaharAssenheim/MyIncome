# Contributing to MyIncome

Thank you for your interest in contributing to MyIncome! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node version, browser)

### Suggesting Features

We welcome feature suggestions! Please:
- Check if the feature is already requested
- Provide clear use cases
- Explain why it would benefit users
- Consider implementation complexity

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   - Ensure all existing functionality works
   - Test edge cases
   - Check responsive design

5. **Commit your changes**
   ```bash
   git commit -m "Add: amazing feature description"
   ```
   
   Use conventional commits:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for updates to existing features
   - `Refactor:` for code refactoring
   - `Docs:` for documentation changes

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Reference related issues
   - Describe what changed and why
   - Include screenshots for UI changes

## 📝 Code Style

### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type when possible

### React
- Use functional components with hooks
- Keep components small and focused
- Use descriptive prop names

### CSS/Tailwind
- Use Tailwind utility classes
- Follow mobile-first approach
- Keep custom CSS minimal

### File Organization
```
✅ Good
components/
  CategoryCard.tsx
  CategoryCard.test.tsx

❌ Avoid
components/
  category-card.tsx
  CategoryCardTest.tsx
```

## 🧪 Testing

Before submitting a PR:
- [ ] Test on different screen sizes
- [ ] Verify authentication flows
- [ ] Check database operations
- [ ] Test error handling
- [ ] Verify form validations

## 🔒 Security

- Never commit sensitive data (.env files)
- Report security issues privately
- Follow security best practices
- Validate all user inputs
- Use parameterized database queries

## 📚 Documentation

Update documentation when:
- Adding new features
- Changing existing behavior
- Modifying configuration
- Adding dependencies

## ❓ Questions?

Feel free to:
- Open a discussion
- Comment on related issues
- Reach out to maintainers

Thank you for contributing! 🎉
