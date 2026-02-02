# Plano de MVP (QtdApp)

Data: 02/02/2026

## 1) Diagnóstico rápido (estado atual)
- **Autenticação e multi-tenant** já existem (Firebase Auth + orgs).
- **Fluxos principais**: importar catálogo (Excel/CSV), cadastrar itens, gerar etiquetas, movimentar estoque, exportar.
- **PWA / offline** parcial (fila de movimentos local).
- **Dashboard** com dados simulados (placeholder).

## 2) Definição de MVP comercial
**Objetivo**: permitir que um cliente pagante consiga **importar itens**, **contar/ajustar estoque**, **imprimir etiquetas** e **exportar resultados** com segurança e confiabilidade.

### Módulos que entram no MVP
1. **Cadastro e importação de itens** (Excel/CSV)
2. **Inventário/ajuste de estoque** (entrada/saída e ajuste manual)
3. **Etiquetas** (designer + impressão PDF)
4. **Exportação** (CSV/TXT)
5. **Admin básico** (dados da empresa e usuários)

### Módulos que podem ficar fora no MVP
- BI/Analytics avançado (Curva ABC real, produtividade)
- Integrações complexas (ERP, webhooks, WhatsApp obrigatório)

## 3) Bloqueadores técnicos para MVP
1. **Saldo não é atualizado no item** após ajuste/movimentação.
   - Hoje a quantidade vem de `item.data.quantidade|estoque`, mas os ajustes só salvam logs.
2. **Dashboard usa dados simulados**.
3. **Gestão de usuários** sem convite/limite de assentos efetivo.

## 4) Plano de execução (curto)
### Sprint 1 (core confiável)
- Atualizar **saldo de estoque** ao salvar ajustes/movimentações.
- Definir **campo padrão de quantidade** (ex.: `quantidade`) com fallback configurável.
- Adicionar validação obrigatória desse campo no schema.

### Sprint 2 (pronto para vender)
- **Admin básico**: dados da empresa, membros, convite e remoção.
- **Limites de plano** aplicados (assentos/pontos/templates).
- **Páginas legais**: Termos e Privacidade.

### Sprint 3 (qualidade e retenção)
- Exportação aprimorada (relatório final da contagem).
- Histórico auditável por item e por ponto.
- Guia rápido e onboarding simplificado.

## 5) Métricas de MVP
- Tempo para 1ª contagem completa: < 1h
- Erro de divergência: < 1%
- 80% dos clientes conseguem importar dados sem suporte

## 6) Riscos
- Clientes usando nomes de campo diferentes para quantidade.
- Concorrência de ajustes simultâneos sem lock/versão.

## 7) Próximas decisões
- Campo padrão de quantidade (nome e regras).
- Fluxo de convite de usuários (e-mail ou link).
- Estratégia de cobrança (Cartpanda já previsto no backend).
