# WR Mecanica - WrApp

Aplicacao web (HTML/CSS/JS) para gestao completa de oficina, com foco na WR Mecanica.

## Como executar

1. Abra o arquivo `index.html` no navegador.
2. Clique em `Popular dados de exemplo` para testar rapidamente o fluxo completo.
3. Para acessar os cadastros administrativos, abra `.../admin` no navegador.

## Modulos implementados

- Cadastro base: clientes e veiculos.
- Ordem de servico: abertura, fluxo de status, assinatura digital (nome), fotos antes/depois, PDF e WhatsApp.
- Estoque: entrada, saida automatica no fechamento da OS, estoque minimo, lote/validade e indicadores.
- Financeiro: contas a receber/pagar, fluxo basico de caixa e metricas.
- Dashboard: KPIs em tempo real e graficos (linha, barras, pizza, heatmap).
- Agenda: agendamento, bloqueio de horario, capacidade por mecanico e alertas de atraso.
- CRM: historico do cliente, lembretes automaticos, fidelidade e envio de status.
- Usuarios/seguranca: perfis, permissoes por papel e log de auditoria.
- Relatorios: OS por periodo, faturamento por servico, ranking de clientes, lucro por mecanico e margem por servico.

## Separacao de interface

- Tela padrao: foco operacional (clientes, veiculos, OS, agenda, financeiro etc).
- Tela administrativa (`/admin`): cadastro de funcionarios, servicos, pecas/produtos e estoque.

## Persistencia

- Todos os dados sao salvos no `localStorage` do navegador (`wrmec_v1`).

## Deploy no EasyPanel

### Arquivos de deploy incluidos

- `Dockerfile`
- `nginx.conf`
- `.dockerignore`

### Configuracao no EasyPanel

1. Crie um novo projeto/app e conecte este repositorio.
2. Build Type: `Dockerfile`.
3. Dockerfile Path: `./Dockerfile`.
4. Porta exposta do container: `80`.
5. Healthcheck path: `/health`.
6. Defina o dominio e publique.

### Observacoes

- Este app e estatico (HTML/CSS/JS), servido por Nginx.
- Nao precisa de variaveis de ambiente para funcionar.
- Os dados ficam no `localStorage` do navegador de cada usuario/dispositivo.
