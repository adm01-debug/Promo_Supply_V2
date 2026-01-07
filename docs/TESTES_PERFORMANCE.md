# Testes de Performance com Lighthouse

Este documento descreve os testes de performance implementados usando Lighthouse integrado com Playwright.

## Métricas Monitoradas

### Core Web Vitals

| Métrica | Sigla | Threshold | Descrição |
|---------|-------|-----------|-----------|
| Largest Contentful Paint | LCP | < 4s | Tempo para renderizar o maior elemento visível |
| First Input Delay | FID* | < 600ms | Tempo de resposta à primeira interação |
| Cumulative Layout Shift | CLS | < 0.25 | Estabilidade visual da página |

*FID é medido via Total Blocking Time (TBT) no Lighthouse

### Métricas Adicionais

| Métrica | Threshold | Descrição |
|---------|-----------|-----------|
| First Contentful Paint | < 3s | Primeira renderização de conteúdo |
| Speed Index | < 5.8s | Velocidade de preenchimento visual |
| Time to Interactive | < 7.3s | Tempo até a página ser interativa |

## Scores Mínimos

| Categoria | Desktop | Mobile |
|-----------|---------|--------|
| Performance | 50% | 40% |
| Accessibility | 80% | 80% |
| Best Practices | 80% | 80% |
| SEO | 80% | 80% |

## Executando os Testes

### Local

```bash
# Iniciar o servidor de desenvolvimento
npm run dev

# Em outro terminal, executar os testes de performance
npx playwright test lighthouse-performance.spec.ts
```

### Com Preview Build (Mais Preciso)

```bash
# Build da aplicação
npm run build

# Iniciar o servidor de preview
npm run preview

# Em outro terminal, executar os testes
npx playwright test lighthouse-performance.spec.ts
```

## Relatórios

Os relatórios são gerados automaticamente na pasta `lighthouse-reports/`:

- `{page}-desktop.html` - Relatório HTML completo para desktop
- `{page}-desktop.json` - Dados JSON para processamento
- `{page}-mobile.html` - Relatório HTML completo para mobile
- `{page}-mobile.json` - Dados JSON para mobile

## CI/CD

Os testes de performance são executados automaticamente no GitHub Actions:

1. **Trigger**: Push/PR para `main` ou `master`
2. **Ambiente**: Ubuntu com Chrome instalado
3. **Artefatos**: Relatórios Lighthouse disponíveis por 30 dias

### Visualizando Resultados no CI

1. Vá para a aba "Actions" no GitHub
2. Selecione a execução do workflow
3. Baixe os artefatos "lighthouse-reports"

## Budget de Performance

### JavaScript
- Máximo: 2MB total (comprimido)

### CSS
- Máximo: 500KB total (comprimido)

### Navegação
- DOM Interactive: < 5s
- Load Complete: < 10s

## Otimizações Recomendadas

### Se LCP estiver alto:
- Otimizar imagens (WebP, lazy loading)
- Preload de recursos críticos
- Reduzir CSS/JS bloqueantes

### Se CLS estiver alto:
- Definir dimensões para imagens
- Evitar inserção de conteúdo dinâmico
- Usar font-display: swap

### Se TBT/FID estiver alto:
- Code splitting
- Defer scripts não-críticos
- Reduzir trabalho no main thread

## Estrutura dos Testes

```
e2e/
├── lighthouse-performance.spec.ts    # Testes de performance
├── responsiveness.spec.ts            # Testes de responsividade
├── visual-regression.spec.ts         # Testes visuais
├── accessibility-responsive.spec.ts  # Acessibilidade
├── auth-flow.spec.ts                 # Fluxo de autenticação
├── navigation-flow.spec.ts           # Navegação
├── solicitacoes-flow.spec.ts         # Fluxo de solicitações
└── critical-flows.spec.ts            # Fluxos críticos
```

## Referências

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)
