#!/bin/bash
cd /home/kavia/workspace/code-generation/legacy-cycle-store-system-migration--cycle-store-4890-4602/TestAutomationService
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

