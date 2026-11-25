#!/usr/bin/env bash
# Mide arranque en frío (am start -S -W), memoria (dumpsys meminfo), CPU (/proc/<pid>/stat)
# y fluidez (dumpsys gfxinfo) de la app en el emulador de CI. Actividad 6, GPDS.
# Uso: bash scripts/medir-rendimiento.sh <ruta-del-apk> <carpeta-de-resultados>
# El emulador no es un teléfono real: sus valores son una línea base para comparar versiones.
set -uo pipefail

APK="$1"
OUT="${2:-rendimiento}"
PKG="com.la501.sports"
mkdir -p "$OUT"

limpiar() { tr -d '\r'; }

adb install -r "$APK" > /dev/null
COMP="$(adb shell cmd package resolve-activity --brief "$PKG" | limpiar | tail -n 1)"
echo "Actividad principal: $COMP"
NUCLEOS="$(adb shell nproc | limpiar)"
TICKS="$(adb shell getconf CLK_TCK 2> /dev/null | limpiar)"
[ -z "$TICKS" ] && TICKS=100

# --- 1. Arranque en frío ------------------------------------------------------
: > "$OUT/arranque.txt"
for i in 1 2 3 4 5; do
  adb shell am start -S -W -n "$COMP" | limpiar | grep -E 'LaunchState|TotalTime|WaitTime' >> "$OUT/arranque.txt"
  sleep 10
done
adb shell am force-stop "$PKG"
TIEMPOS="$(grep TotalTime "$OUT/arranque.txt" | awk '{print $2}' | sort -n | tr '\n' ' ')"
MEDIANA="$(grep TotalTime "$OUT/arranque.txt" | awk '{print $2}' | sort -n | awk '{a[NR]=$1} END {print a[int((NR+1)/2)]}')"

# --- 2. Memoria con el menú cargado ------------------------------------------
maestro test .maestro/01-abrir-app.yaml > "$OUT/maestro-01.txt" 2>&1
sleep 5
adb shell dumpsys meminfo "$PKG" | limpiar > "$OUT/meminfo-menu.txt"
PSS_MENU="$(grep 'TOTAL PSS:' "$OUT/meminfo-menu.txt" | awk '{print $3}')"
RSS_MENU="$(grep 'TOTAL PSS:' "$OUT/meminfo-menu.txt" | awk '{print $6}')"

# --- 3 y 4. CPU y fluidez durante el recorrido del menú ----------------------
PID="$(adb shell pidof "$PKG" | limpiar)"
adb shell dumpsys gfxinfo "$PKG" reset > /dev/null
CPU0="$(adb shell cat "/proc/$PID/stat" | limpiar | awk '{print $14 + $15}')"
T0="$(date +%s.%N)"
maestro test .maestro/rendimiento/recorrido-menu.yaml > "$OUT/maestro-recorrido.txt" 2>&1
RECORRIDO=$?
T1="$(date +%s.%N)"
CPU1="$(adb shell cat "/proc/$PID/stat" | limpiar | awk '{print $14 + $15}')"
PID_FINAL="$(adb shell pidof "$PKG" | limpiar)"
adb shell dumpsys gfxinfo "$PKG" | limpiar > "$OUT/gfxinfo.txt"
adb shell dumpsys meminfo "$PKG" | limpiar > "$OUT/meminfo-recorrido.txt"
PSS_FIN="$(grep 'TOTAL PSS:' "$OUT/meminfo-recorrido.txt" | awk '{print $3}')"

SEG="$(awk -v a="$T0" -v b="$T1" 'BEGIN {printf "%.1f", b - a}')"
CPU_SEG="$(awk -v a="$CPU0" -v b="$CPU1" -v t="$TICKS" 'BEGIN {printf "%.2f", (b - a) / t}')"
CPU_PCT="$(awk -v c="$CPU_SEG" -v s="$SEG" 'BEGIN {printf "%.1f", c / s * 100}')"
CPU_PCT_TOTAL="$(awk -v p="$CPU_PCT" -v n="$NUCLEOS" 'BEGIN {printf "%.1f", p / n}')"

CUADROS="$(grep 'Total frames rendered' "$OUT/gfxinfo.txt" | head -1 | awk -F': ' '{print $2}')"
LENTOS="$(grep 'Janky frames:' "$OUT/gfxinfo.txt" | head -1 | awk -F': ' '{print $2}')"
P50="$(grep '50th percentile' "$OUT/gfxinfo.txt" | head -1 | awk -F': ' '{print $2}')"
P90="$(grep '90th percentile' "$OUT/gfxinfo.txt" | head -1 | awk -F': ' '{print $2}')"
P95="$(grep '95th percentile' "$OUT/gfxinfo.txt" | head -1 | awk -F': ' '{print $2}')"
P99="$(grep '99th percentile' "$OUT/gfxinfo.txt" | head -1 | awk -F': ' '{print $2}')"

kb_a_mb() { awk -v k="$1" 'BEGIN { if (k == "") print "—"; else printf "%.1f", k / 1024 }'; }

{
  echo "## Rendimiento de la app en el emulador (API 34, x86_64)"
  echo
  echo "| Métrica | Resultado |"
  echo "| --- | --- |"
  echo "| Arranque en frío, TotalTime (5 mediciones, ms) | $TIEMPOS|"
  echo "| Arranque en frío, mediana | ${MEDIANA} ms |"
  echo "| Memoria PSS con el menú cargado | $(kb_a_mb "$PSS_MENU") MB (RSS $(kb_a_mb "$RSS_MENU") MB) |"
  echo "| Memoria PSS después del recorrido | $(kb_a_mb "$PSS_FIN") MB |"
  echo "| CPU durante el recorrido | ${CPU_SEG} s de CPU en ${SEG} s = ${CPU_PCT} % de un núcleo (${CPU_PCT_TOTAL} % de ${NUCLEOS} núcleos) |"
  echo "| Cuadros dibujados | ${CUADROS} |"
  echo "| Cuadros lentos (janky) | ${LENTOS} |"
  echo "| Tiempo por cuadro p50 / p90 / p95 / p99 | ${P50} / ${P90} / ${P95} / ${P99} |"
  echo "| Recorrido de Maestro | $([ "$RECORRIDO" -eq 0 ] && echo 'completo' || echo "terminó con código $RECORRIDO") |"
  echo "| Mismo proceso durante la medición | $([ "$PID" = "$PID_FINAL" ] && echo "sí (PID $PID)" || echo "no: $PID → $PID_FINAL") |"
} > "$OUT/resumen.md"

{
  echo "arranque_mediana_ms=$MEDIANA"
  echo "arranque_ms=$TIEMPOS"
  echo "pss_menu_mb=$(kb_a_mb "$PSS_MENU")"
  echo "pss_recorrido_mb=$(kb_a_mb "$PSS_FIN")"
  echo "cpu_pct_nucleo=$CPU_PCT"
  echo "cuadros=$CUADROS"
  echo "lentos=$LENTOS"
  echo "p50_p90_p95_p99=$P50 $P90 $P95 $P99"
  echo "recorrido=$RECORRIDO"
} > "$OUT/resumen.env"

cat "$OUT/resumen.md"
