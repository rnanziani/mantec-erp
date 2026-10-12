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

function Decode-Base64Url([string]$s) {
  $t = $s.Replace('-', '+').Replace('_', '/')
  switch ($t.Length % 4) {
    2 { $t += '==' }
    3 { $t += '=' }
  }
  $bytes = [Convert]::FromBase64String($t)
  return [Text.Encoding]::UTF8.GetString($bytes)
}

function Register-Protocol {
  $vbs = Join-Path $PSScriptRoot 'imprimir-etiqueta.vbs'
  $cmd = "wscript.exe //B `"$vbs`" `"%1`""
  $root = "HKCU:\Software\Classes\$Protocol"
  New-Item -Path $root -Force | Out-Null
  Set-ItemProperty -Path $root -Name '(default)' -Value 'URL:Mantec Etiqueta TLP'
  New-ItemProperty -Path $root -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
  New-Item -Path "$root\shell\open\command" -Force | Out-Null
  Set-ItemProperty -Path "$root\shell\open\command" -Name '(default)' -Value $cmd
  Write-Log "Protocolo $Protocol registrado -> $vbs"
  Write-Host "Listo. El clic Imprimir del ERP manda RAW y el proceso se cierra solo."
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

function Split-EplDesc([string]$s, [int]$maxLine) {
  $t = Get-EplText $s ($maxLine * 2)
  if ($t.Length -le $maxLine) {
    return @{ L1 = $t; L2 = '' }
  }
  $cut = $maxLine
  $space = $t.LastIndexOf(' ', [Math]::Min($maxLine, $t.Length - 1))
  if ($space -ge 6) { $cut = $space }
  return @{
    L1 = $t.Substring(0, $cut).Trim()
    L2 = Get-EplText $t.Substring($cut).Trim() $maxLine
  }
}

function Get-EplCommand([string]$codigo, [string]$desc, [string]$prov, [int]$copias) {
  $n = $codigo.Trim().Length
  if ($copias -lt 1) { $copias = 1 }
  if ($copias -gt 20) { $copias = 20 }
  # Layout 100 x 30 mm identico a etiquetas/../formularios/_gen/etiqueta-kaufmann.ps1
  # (la foto 2 que si se leia). No recortar a 15 mm ni S2/D10.
  $codigo = Get-EplText $codigo 25
  $desc = Get-EplText $desc 42
  $prov = Get-EplText $prov 12
  if ($n -le 8) {
    # LAYOUT APROBADO 32x20: 3 columnas. X 4 / 284 / 556. Código+proveedor en una
    # línea; descripción en 2 filas si no cabe. Copias = filas. No mover.
    $codigo = Get-EplText $codigo 8
    $prov = Get-EplText $prov 10
    $partes = Split-EplDesc $desc 22
    $d1 = $partes.L1
    $d2 = $partes.L2
    $x0 = 4
    $x1 = 284
    $x2 = 556
    $xp0 = $x0 + ($codigo.Length * 12) + 8
    $xp1 = $x1 + ($codigo.Length * 12) + 8
    $xp2 = $x2 + ($codigo.Length * 12) + 8
    $epl = @"
N
q812
Q160,24
ZT
I8,A,001
A$x0,6,0,2,1,1,N,"$codigo"
A$xp0,8,0,1,1,1,N,"$prov"
B$x0,28,0,1,2,4,58,N,"$codigo"
A$x0,92,0,1,1,1,N,"$d1"
A$x0,108,0,1,1,1,N,"$d2"
A$x1,6,0,2,1,1,N,"$codigo"
A$xp1,8,0,1,1,1,N,"$prov"
B$x1,28,0,1,2,4,58,N,"$codigo"
A$x1,92,0,1,1,1,N,"$d1"
A$x1,108,0,1,1,1,N,"$d2"
A$x2,6,0,2,1,1,N,"$codigo"
A$xp2,8,0,1,1,1,N,"$prov"
B$x2,28,0,1,2,4,58,N,"$codigo"
A$x2,92,0,1,1,1,N,"$d1"
A$x2,108,0,1,1,1,N,"$d2"
P$copias

"@
  } elseif ($n -le 14) {
    # LAYOUT APROBADO 50x30: 2 columnas en el rollo 100 mm. Columna der +5 mm (X+40).
    # No mover. El 32x20 y el 100x30 tampoco.
    $codigo = Get-EplText $codigo 14
    $desc = Get-EplText $desc 28
    $epl = @"
N
q812
Q240,24
ZT
I8,A,001
A12,8,0,3,1,1,N,"$codigo"
A268,10,0,1,1,1,N,"$prov"
B12,42,0,1,2,4,100,N,"$codigo"
A12,158,0,2,1,1,N,"$desc"
A458,8,0,3,1,1,N,"$codigo"
A714,10,0,1,1,1,N,"$prov"
B458,42,0,1,2,4,100,N,"$codigo"
A458,158,0,2,1,1,N,"$desc"
P$copias

"@
  } else {
    # LAYOUT APROBADO (foto 100x30 legible). No mover X/Y ni bajar Q.
    # Igual a formularios/_gen/etiqueta-kaufmann.ps1 (sin Fact. de factura).
    $epl = @"
N
q812
Q240,24
ZT
I8,A,001
A16,8,0,3,1,1,N,"$codigo"
A640,10,0,1,1,1,N,"$prov"
B16,42,0,1,2,4,100,N,"$codigo"
A16,158,0,2,1,1,N,"$desc"
P$copias

"@
  }
  return $epl
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
  $bytes = [Text.Encoding]::ASCII.GetBytes($epl.Replace("`n", "`r`n"))
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

$uriArg = $env:MANTEC_ETIQUETA_URI
if (-not $uriArg) {
  $piezas = @()
  if ($Rest) { $piezas += $Rest }
  if ($args) { $piezas += $args }
  if ($piezas.Count -gt 0) { $uriArg = ($piezas -join '&') }
}

try {
  Write-Log "IN $uriArg"
  if ($uriArg) {
    $m = Get-QueryMap $uriArg
    if ($m['d']) {
      $obj = (Decode-Base64Url $m['d']) | ConvertFrom-Json
      $Codigo = [string]$obj.codigo_89
      $Descripcion = [string]$obj.descripcion_89
      $Proveedor = [string]$obj.proveedor_89
      if ($obj.copias) { $Copias = [int]$obj.copias }
    } else {
      if ($m['codigo_89']) { $Codigo = [string]$m['codigo_89'] }
      if ($m['descripcion_89']) { $Descripcion = [string]$m['descripcion_89'] }
      if ($m['proveedor_89']) { $Proveedor = [string]$m['proveedor_89'] }
      if ($m['copias']) { $Copias = [int]$m['copias'] }
    }
  }
  Send-Etiqueta $Codigo $Descripcion $Proveedor $Copias
  exit 0
} catch {
  Write-Log "ERROR $($_.Exception.Message)"
  exit 1
}
