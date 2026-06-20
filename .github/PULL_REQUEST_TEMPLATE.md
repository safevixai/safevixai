## Description
<!-- Brief description of changes. Include motivation and context. -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix
- [ ] Infrastructure / Terraform
- [ ] CI/CD pipeline
- [ ] Refactor (no functional changes)

## Related Issues
Closes #
<!-- List any related issues or discussions -->

## Testing
- [ ] Added/updated unit tests
- [ ] Ran backend tests: `pytest tests/ -q`
- [ ] Ran chatbot tests: `pytest tests/ -q`
- [ ] Ran frontend tests: `npm test`
- [ ] Type check passed: `npx tsc --noEmit`
- [ ] Build passed: `npm run build`
- [ ] Bundle analysis within budget: `node scripts/bundle-analysis.mjs`
- [ ] E2E tests passed: `npx playwright test e2e/`
- [ ] Manual testing performed

## Security Checklist
- [ ] No secrets or credentials committed
- [ ] `.env` files not modified
- [ ] CSP nonce approach maintained (no `'unsafe-inline'` in scripts)
- [ ] No new `dangerouslySetInnerHTML` / `innerHTML`
- [ ] No `any` types added
- [ ] Input sanitization / validation applied
- [ ] Auth checks in place for new endpoints

## Performance Checklist
- [ ] No large dependencies added
- [ ] Dynamic imports used for heavy components
- [ ] No render-blocking resources
- [ ] Images optimized / lazy-loaded
- [ ] Bundle size impact reviewed

## Deployment Notes
<!-- Any special deployment steps, migrations, env vars, or rollback concerns -->
- [ ] Database migration required
- [ ] New environment variables added
- [ ] Terraform changes needed
- [ ] Rollback strategy documented

## Screenshots (if applicable)
<!-- Add screenshots for UI changes. Use dark/light mode comparison. -->

## Reviewer Notes
<!-- What should the reviewer focus on? Any risky areas? -->
