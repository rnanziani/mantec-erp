# Un disparo: el ERP abre mantec-etiqueta:// , este script manda EPL RAW y SALE.
param(
  [switch]$Registrar,
  [string]$Codigo,
  [string]$Descripcion,
  [string]$Proveedor,
  [int]$Copias = 1,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Rest
)

$ErrorActionPreference = 'Stop'
$PrinterName = 'ZDesigner LP 2844'
$Protocol = 'mantec-etiqueta'
$LogFile = Join-Path $PSScriptRoot 'agente-etiqueta.log'

function Write-Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
  try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch {}
}

function Register-Protocol {
  $ps1 = $PSCommandPath
  $cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ps1`" `"%1`""
  $root = "HKCU:\Software\Classes\$Protocol"
  New-Item -Path $root -Force | Out-Null
  Set-ItemProperty -Path $root -Name '(default)' -Value 'URL:Mantec Etiqueta TLP'
  New-ItemProperty -Path $root -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
  New-Item -Path "$root\shell\open\command" -Force | Out-Null
  Set-ItemProperty -Path "$root\shell\open\command" -Name '(default)' -Value $cmd
  Write-Log "Protocolo $Protocol registrado -> $ps1"
  Write-Host "Listo. El clic Imprimir del ERP abre este script, manda RAW y se cierra solo."
  Write-Host "No hace falta dejar ninguna ventana abierta."
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrinterEtiqueta {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  public static bool SendBytes(string printer, byte[] data, string docName) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return false;
    var di = new DOCINFOA();
    di.pDocName = docName;
    di.pDataType = "RAW";
    if (!StartDocPrinter(h, 1, di)) { ClosePrinter(h); return false; }
    StartPagePrinter(h);
    IntPtr p = Marshal.AllocHGlobal(data.Length);
    Marshal.Copy(data, 0, p, data.Length);
    int written;
    bool ok = WritePrinter(h, p, data.Length, out written);
    Marshal.FreeHGlobal(p);
    EndPagePrinter(h);
    EndDocPrinter(h);
    ClosePrinter(h);
    return ok && written == data.Length;
  }
}
'@

function Get-EplText([string]$s, [int]$max) {
  if ($null -eq $s) { return '' }
  $t = $s.Trim().ToUpperInvariant() -replace '"', '' -replace "`r", '' -replace "`n", ' '
  if ($t.Length -gt $max) { $t = $t.Substring(0, $max) }
  return $t
}

function Get-EplCommand([string]$codigo, [string]$desc, [string]$prov, [int]$copias) {
  $n = $codigo.Trim().Length
  if ($n -le 8) {
    $q = 256; $Q = 176; $gap = 16
    $codigo = Get-EplText $codigo 12
    $prov = Get-EplText $prov 10
    $desc = Get-EplText $desc 18
    $body = @"
A8,6,0,1,1,1,N,"$codigo"
A8,22,0,1,1,1,N,"$prov"
B8,38,0,1,2,2,70,N,"$codigo"
A8,118,0,1,1,1,N,"$desc"
"@
  } elseif ($n -le 14) {
    $q = 400; $Q = 240; $gap = 24
    $codigo = Get-EplText $codigo 16
    $prov = Get-EplText $prov 14
    $desc = Get-EplText $desc 28
    $body = @"
A12,8,0,2,1,1,N,"$codigo"
A12,36,0,1,1,1,N,"$prov"
B12,54,0,1,2,3,90,N,"$codigo"
A12,160,0,2,1,1,N,"$desc"
"@
  } else {
    $q = 812; $Q = 240; $gap = 24
    $codigo = Get-EplText $codigo 25
    $prov = Get-EplText $prov 18
    $desc = Get-EplText $desc 40
    $body = @"
A16,8,0,3,1,1,N,"$codigo"
A640,10,0,1,1,1,N,"$prov"
B16,42,0,1,2,4,100,N,"$codigo"
A16,158,0,2,1,1,N,"$desc"
"@
  }
  if ($copias -lt 1) { $copias = 1 }
  if ($copias -gt 20) { $copias = 20 }
  return @"
N
q$q
Q$Q,$gap
ZT
I8,A,001
$body
P$copias

"@
}

function Get-QueryMap([string]$uriRaw) {
  $map = @{}
  $uriRaw = $uriRaw.Trim().Trim('"')
  $qPos = $uriRaw.IndexOf('?')
  if ($qPos -lt 0) { return $map }
  $query = $uriRaw.Substring($qPos + 1)
  foreach ($part in $query.Split('&')) {
    if (-not $part) { continue }
    $eq = $part.IndexOf('=')
    if ($eq -lt 0) { continue }
    $k = [Uri]::UnescapeDataString($part.Substring(0, $eq))
    $v = [Uri]::UnescapeDataString($part.Substring($eq + 1).Replace('+', ' '))
    $map[$k] = $v
  }
  return $map
}

function Clear-ColaTlp {
  try {
    Get-PrintJob -PrinterName $PrinterName -ErrorAction SilentlyContinue |
      Remove-PrintJob -ErrorAction SilentlyContinue
  } catch {}
  try { Resume-Printer -Name $PrinterName -ErrorAction SilentlyContinue } catch {}
}

function Send-Etiqueta([string]$codigo, [string]$desc, [string]$prov, [int]$copias) {
  if (-not $codigo -or -not $desc -or -not $prov) {
    throw 'codigo, descripcion y proveedor son requeridos'
  }
  if (-not (Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue)) {
    throw "No encuentro la impresora $PrinterName"
  }
  Clear-ColaTlp
  $epl = Get-EplCommand $codigo $desc $prov $copias
  $bytes = [Text.Encoding]::GetEncoding(1252).GetBytes($epl.Replace("`n", "`r`n"))
  $ok = [RawPrinterEtiqueta]::SendBytes($PrinterName, $bytes, "Etiqueta $codigo")
  if (-not $ok) {
    $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw "Fallo RAW Win32=$err"
  }
  Write-Log "OK $codigo x$copias ($($bytes.Length) bytes)"
}

if ($Registrar) {
  Register-Protocol
  exit 0
}

$uriArg = $null
if ($Rest -and $Rest.Count -gt 0) { $uriArg = $Rest[0] }
if (-not $uriArg -and $args.Count -ge 1 -and "$($args[0])" -like "$Protocol`:*") { $uriArg = [string]$args[0] }

try {
  if ($uriArg -and "$uriArg" -like "$Protocol`:*") {
    $m = Get-QueryMap $uriArg
    $Codigo = [string]$m['codigo_89']
    $Descripcion = [string]$m['descripcion_89']
    $Proveedor = [string]$m['proveedor_89']
    if ($m['copias']) { $Copias = [int]$m['copias'] }
  }
  Send-Etiqueta $Codigo $Descripcion $Proveedor $Copias
  exit 0
} catch {
  Write-Log "ERROR $($_.Exception.Message)"
  exit 1
}
