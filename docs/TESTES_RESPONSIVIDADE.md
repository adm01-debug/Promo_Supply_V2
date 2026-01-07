# Testes de Responsividade - Playwright

## Configuração

O projeto agora inclui testes automatizados de responsividade com Playwright.

### Estrutura de Arquivos

```
e2e/
├── responsiveness.spec.ts      # Testes gerais de responsividade
├── visual-regression.spec.ts   # Testes de regressão visual
└── accessibility-responsive.spec.ts  # Testes de acessibilidade responsiva

playwright.config.ts            # Configuração do Playwright
```

## Execução dos Testes

### Instalar Browsers (primeira vez)
```bash
npx playwright install
```

### Rodar Todos os Testes
```bash
npx playwright test
```

### Rodar Testes Específicos
```bash
# Apenas testes de responsividade
npx playwright test responsiveness

# Apenas testes de acessibilidade
npx playwright test accessibility

# Apenas regressão visual
npx playwright test visual-regression
```

### Rodar em Viewport Específico
```bash
npx playwright test --project="Mobile Portrait"
npx playwright test --project="Tablet Portrait"
npx playwright test --project="Desktop"
```

### Ver Relatório
```bash
npx playwright show-report
```

### Modo UI (Debug)
```bash
npx playwright test --ui
```

## Viewports Testados

| Nome | Largura | Altura | Descrição |
|------|---------|--------|-----------|
| Mobile Portrait | 375px | 667px | iPhone |
| Mobile Landscape | 667px | 375px | iPhone horizontal |
| Tablet Portrait | 768px | 1024px | iPad |
| Tablet Landscape | 1024px | 768px | iPad horizontal |
| Desktop | 1280px | 720px | Laptop |
| Desktop Large | 1920px | 1080px | Monitor Full HD |

## Breakpoints Verificados

Os testes verificam comportamento correto nos breakpoints do Tailwind:
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## Categorias de Testes

### 1. Responsiveness Tests
- Verificação de overflow horizontal
- Visibilidade de elementos críticos
- Adaptação de grids e layouts
- Comportamento de modais

### 2. Visual Regression Tests
- Screenshots em todos os viewports
- Comparação visual automatizada
- Detecção de regressões

### 3. Accessibility Responsive Tests
- Touch targets mínimos (44x44px)
- Suporte a zoom de texto (150%, 200%)
- Orientação portrait/landscape
- Reflow de conteúdo (320px)
- Gerenciamento de foco

## Critérios de Sucesso

✅ **Sem overflow horizontal** em nenhum viewport
✅ **Touch targets ≥ 44px** em dispositivos móveis
✅ **Navegação acessível** em todos os tamanhos
✅ **Modais responsivos** que não excedem viewport
✅ **Texto legível** (mínimo 14px)
✅ **Suporte a zoom** até 200% sem quebra

## Atualização de Snapshots

Para atualizar screenshots de referência:
```bash
npx playwright test --update-snapshots
```

## Integração CI/CD

Adicione ao seu pipeline:
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npx playwright test

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```
