; Passos extra do instalador do Tauri (NSIS)

; Ao desinstalar (não nas atualizações): tira o "Iniciar com o Windows" do registo
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AeroHub Connector"
  ${EndIf}
!macroend
