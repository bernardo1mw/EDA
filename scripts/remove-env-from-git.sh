#!/bin/bash
# Script para remover arquivos .env do índice do Git
# Mantém os arquivos localmente, apenas remove do controle de versão

echo "🔍 Procurando arquivos .env rastreados pelo Git..."
ENV_FILES=$(git ls-files | grep -E "\.env$" | grep -v "\.env\.example")

if [ -z "$ENV_FILES" ]; then
    echo "✅ Nenhum arquivo .env encontrado no índice do Git"
    exit 0
fi

echo "⚠️  Arquivos .env encontrados no índice:"
echo "$ENV_FILES"
echo ""
read -p "Deseja remover estes arquivos do índice do Git? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Removendo arquivos .env do índice do Git..."
    echo "$ENV_FILES" | xargs -I {} git rm --cached {}
    echo "✅ Arquivos removidos do índice (mantidos localmente)"
    echo ""
    echo "📝 Próximos passos:"
    echo "   1. Commit as mudanças: git commit -m 'Remove .env files from git'"
    echo "   2. Verifique se o .gitignore está correto"
    echo "   3. Os arquivos .env continuam existindo localmente"
else
    echo "❌ Operação cancelada"
    exit 1
fi
