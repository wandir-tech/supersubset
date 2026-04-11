# Browser Test Plan D — Host Integration

## Objective
Verify Supersubset components work correctly when mounted inside a host application, with host-owned persistence, auth, and routing.

## Steps

### 1. Mount Designer in Host Shell
- [ ] Mount `<SupersubsetDesigner />` inside a host React app layout
- [ ] Verify designer respects host container sizing
- [ ] Verify designer does not break host app CSS
- [ ] Verify designer does not inject global styles that affect host
- [ ] Take screenshot: designer inside host

### 2. Persist Schema via Host Callback
- [ ] Configure `onSave` callback on designer
- [ ] Create and save a dashboard
- [ ] Verify `onSave` receives canonical DashboardDefinition
- [ ] Store to host-controlled location (localStorage for test)
- [ ] Reload page
- [ ] Retrieve stored schema and load into designer
- [ ] Verify round-trip preserved

### 3. Mount Renderer in Separate Route
- [ ] Mount `<SupersubsetRenderer />` on different route from designer
- [ ] Pass the same saved definition
- [ ] Verify renderer loads independently
- [ ] Verify renderer has no dependency on designer imports
- [ ] Take screenshot: renderer on separate route

### 4. Verify No Hidden Backend Dependency
- [ ] Disconnect network (mock adapter only)
- [ ] Verify designer still opens and can edit
- [ ] Verify renderer renders from cached/local data
- [ ] Verify no failed requests to Superset/Rill/Lightdash endpoints
- [ ] Check network tab for unexpected external calls

### 5. Host Theme Integration
- [ ] Pass host theme tokens to designer and renderer
- [ ] Verify components adopt host colors, fonts, spacing
- [ ] Verify no Supersubset-default styles leak through
- [ ] Take screenshot: themed components

### 6. Host Auth Integration
- [ ] Pass user context / capabilities via props
- [ ] Verify designer respects visibility rules
- [ ] Verify renderer applies permission-based widget hiding
- [ ] Verify no auth requests to external services

### 7. Multiple Instances
- [ ] Mount two `<SupersubsetRenderer />` instances on same page
- [ ] Verify they operate independently
- [ ] Verify filter changes in one don't affect the other
- [ ] Verify no shared global state conflicts

### 8. Bundle Size Verification
- [ ] Build host app with designer
- [ ] Build host app with renderer only
- [ ] Verify renderer bundle is smaller (no designer dependencies)
- [ ] Record bundle sizes for baseline

## Pass Criteria
- Components mount cleanly in host without CSS conflicts
- Host persistence callback works for save/load cycle
- Renderer works independently of designer package
- No hidden external service dependencies
- Theming bridge works with host-supplied tokens
- Multiple instances coexist without conflicts
