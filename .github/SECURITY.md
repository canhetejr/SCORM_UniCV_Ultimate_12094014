# Política de Segurança

## Versões Suportadas

Atualmente, apenas a versão mais recente do Player UniCV recebe atualizações de segurança.

| Versão | Suportada          |
| ------ | ------------------ |
| main   | :white_check_mark: |
| < 1.0  | :x:                |

## Reportar uma Vulnerabilidade

A segurança é uma prioridade para o Player UniCV. Se você descobriu uma vulnerabilidade de segurança, agradecemos sua ajuda em divulgá-la de forma responsável.

### Como Reportar

**Por favor, NÃO reporte vulnerabilidades de segurança através de issues públicas do GitHub.**

Em vez disso, use um dos seguintes métodos:

1. **GitHub Security Advisories (Recomendado)**
   - Vá para a aba [Security](https://github.com/canhetejr/SCORM_UniCV_Ultimate_12094014/security) do repositório
   - Clique em "Report a vulnerability"
   - Preencha o formulário com os detalhes

2. **E-mail direto**
   - Envie os detalhes para: [seu-email@unicv.edu.cv] 
   - Assunto: "[SECURITY] Player UniCV - [Breve descrição]"

### O que incluir no relatório

Para nos ajudar a entender e resolver o problema rapidamente, inclua:

- Tipo de vulnerabilidade (ex.: XSS, CSRF, injeção, etc.)
- Passos detalhados para reproduzir o problema
- Localização do código afetado (arquivo e linha, se possível)
- Impacto potencial da vulnerabilidade
- Sugestões de correção (se houver)
- Seu nome/pseudônimo para crédito (opcional)

### Resposta

- **Confirmação**: Você receberá uma resposta confirmando o recebimento do relatório em até 48 horas
- **Investigação**: Avaliaremos o relatório e forneceremos uma resposta mais detalhada em até 7 dias
- **Correção**: Se a vulnerabilidade for confirmada, trabalharemos em uma correção e coordenaremos a divulgação com você
- **Crédito**: Se desejar, você será creditado na correção da vulnerabilidade

### Política de Divulgação

- Pedimos que você não divulgue publicamente a vulnerabilidade até que uma correção seja lançada
- Trabalharemos para corrigir vulnerabilidades confirmadas em até 90 dias
- Coordenaremos a divulgação pública com você
- Você será creditado pela descoberta (a menos que prefira anonimato)

## Práticas de Segurança do Projeto

### SCORM e LMS

- O player é executado dentro de um iframe no LMS (Moodle)
- Comunicação com a API SCORM usa apenas os métodos padronizados do SCORM 1.2
- Dados do usuário (progresso) são armazenados apenas via API SCORM do LMS

### Dados e Privacidade

- Nenhum dado pessoal é coletado ou armazenado pelo player
- O progresso é armazenado via SCORM no LMS (Moodle)
- Nenhuma requisição é feita para servidores externos além do webhook N8N (configurável)

### Dependências

- As dependências são verificadas regularmente via Dependabot
- Usamos apenas dependências essenciais em `devDependencies` (nenhuma em runtime)
- O player funciona com JavaScript vanilla, sem frameworks externos

## Agradecimentos

Agradecemos aos pesquisadores de segurança que ajudam a manter o Player UniCV seguro para todos os usuários.
