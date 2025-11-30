Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

' Run the PowerShell launcher hidden
' The launcher.ps1 handles starting backend/frontend, opening browser, and monitoring for shutdown
WshShell.Run "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File ""launcher.ps1""", 0, False
