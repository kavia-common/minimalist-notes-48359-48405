#!/bin/bash
cd /home/kavia/workspace/code-generation/minimalist-notes-48359-48405/notes_app_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

