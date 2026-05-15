# ADR 0001: Arquitetura Baseada em Funcionalidades (Feature-Based Architecture)

## Status
Proposto e em implementação.

## Contexto
O projeto estava utilizando uma estrutura técnica tradicional (`hooks/`, `components/`, `schemas/`), o que dificulta a escalabilidade e a localização de lógicas relacionadas quando o sistema cresce.

## Decisão
Adotar uma estrutura baseada em funcionalidades dentro de `src/features/`. Cada funcionalidade deve conter:
- `hooks/`: Hooks específicos da funcionalidade.
- `components/`: Componentes exclusivos da funcionalidade.
- `schemas/`: Esquemas de validação (Zod) e tipos.
- `services/`: (Opcional) Chamadas de API específicas.
- `index.ts`: Ponto de entrada público da funcionalidade.

## Consequências
- **Positivas**: Melhor isolamento, facilidade de manutenção, redução de acoplamento circular.
- **Negativas**: Maior profundidade de diretórios inicialmente.
- **Regra**: Componentes compartilhados continuam em `src/components/ui` ou `src/components/common`.
