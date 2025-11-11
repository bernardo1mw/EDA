#!/bin/bash
# Git pre-commit hook para prevenir commit de arquivos .env
# Para instalar: ln -s ../../scripts/pre-commit-env-check.sh .git/hooks/pre-commit

STAGED_ENV_FILES=$(git diff --cached --name-only | grep -E "\.env$" | grep -v "\.env\.example")

if [ ! -z "$STAGED_ENV_FILES" ]; then
    echo "❌ ERRO: Tentativa de commitar arquivos .env!"
    echo ""
    echo "Os seguintes arquivos .env foram detectados:"
    echo "$STAGED_ENV_FILES"
    echo ""
    echo "⚠️  Arquivos .env contêm informações sensíveis e NÃO devem ser commitados."
    echo "💡 Use arquivos .env.example como template."
    echo ""
    echo "Para remover estes arquivos do staging:"
    echo "  git reset HEAD <arquivo>"
    echo ""
    exit 1
fi

exit 0
