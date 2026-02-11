# ChurchFlow - Sistema de Gestão Eclesiástica

Sistema moderno de gestão para igrejas, desenvolvido com React, TypeScript e Tailwind CSS.

## 🚀 Tecnologias

- **React 18** - Biblioteca para interfaces de usuário
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool e dev server ultra-rápido
- **Tailwind CSS** - Framework CSS utility-first
- **Shadcn/UI** - Componentes UI reutilizáveis
- **Lucide React** - Ícones modernos
- **React Router** - Roteamento client-side

## 🎨 Design

O projeto utiliza um esquema de cores **marinho e dourado**:
- **Primary (Marinho)**: Indigo profundo para elementos principais
- **Secondary (Dourado)**: Amber para destaques e CTAs
- **Border Radius**: 2xl (1rem) para um visual moderno e arredondado

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build de produção
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── dashboard/      # Componentes específicos do dashboard
│   ├── layout/         # Componentes de layout (Sidebar, etc)
│   └── ui/            # Componentes UI base (Shadcn/UI)
├── data/              # Mock data e dados estáticos
├── lib/               # Utilitários e helpers
├── pages/             # Páginas da aplicação
├── types/             # Definições TypeScript
├── App.tsx            # Componente principal
├── main.tsx           # Entry point
└── index.css          # Estilos globais
```

## 🎯 Funcionalidades

### Implementadas
- ✅ Dashboard com KPIs
- ✅ Sidebar de navegação fixa
- ✅ Cards de estatísticas
- ✅ Lista de visitantes recentes
- ✅ Ações rápidas
- ✅ Sistema de rotas

### Em Desenvolvimento
- 🔄 Gestão de Membros
- 🔄 Gestão de Visitantes
- 🔄 Gestão de Grupos
- 🔄 Eventos
- 🔄 Finanças
- 🔄 Configurações

## 📊 Mock Data

O projeto utiliza dados fictícios (mock data) para demonstração:
- 342 membros totais
- 28 visitantes este mês
- 12 grupos ativos
- R$ 45.230,50 em contribuições mensais

## 🎨 Componentes UI

Baseados no Shadcn/UI:
- `Card` - Cards com bordas arredondadas
- `Skeleton` - Estados de carregamento
- Mais componentes serão adicionados conforme necessário

## 📝 Licença

Este projeto é privado e destinado ao uso interno.
