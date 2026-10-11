' Lanza el RAW oculto. El protocolo Windows entrega la URL en el argumento 1.
Option Explicit
If WScript.Arguments.Count < 1 Then WScript.Quit 1

Dim uri, fso, dir, ps1, sh, cmd
uri = WScript.Arguments(0)

Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = dir & "\agente-etiqueta.ps1"

Set sh = CreateObject("WScript.Shell")
sh.Environment("PROCESS")("MANTEC_ETIQUETA_URI") = uri
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"
' 0 = oculto; True = espera a que termine el RAW y el proceso muere.
sh.Run cmd, 0, True
