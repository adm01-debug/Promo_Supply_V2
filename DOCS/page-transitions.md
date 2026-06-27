# Transições de Página

Sistema modular sobre Framer Motion. Wrapper único `PageTransition` usado em `MainLayout`.

## Presets disponíveis
`fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `zoom-in`, `zoom-out`, `flip-x`, `flip-y`, `parallax`, `blur-scale` (default), `none`.

## Override por rota
Edite `src/features/layout/transitions/config.ts`:
```ts
export const ROUTE_OVERRIDES: TransitionOverride[] = [
  { pattern: /^\/compras\/wizard/, preset: "slide-left" },
  { pattern: /^\/admin/, preset: "fade", duration: 0.25 },
];
```
Primeira regra que casar com `pathname` vence.

## Criar preset custom
Adicione em `presets.ts`:
```ts
"my-fx": {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -10 },
  transition: { duration: 0.3, ease: [0.23,1,0.32,1] },
}
```
E inclua no union `TransitionName`.

## Acessibilidade
`prefers-reduced-motion: reduce` força automaticamente o preset `none`.

## Performance
Apenas `transform`, `opacity` e `filter` — compositor GPU. `will-change: transform, opacity` aplicado no wrapper.
