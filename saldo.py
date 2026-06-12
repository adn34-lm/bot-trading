import time
import ccxt
import os
from datetime import datetime, timezone

# ============================================================
#                            las keys 
# ============================================================
exchange = ccxt.binance({
    'apiKey': os.environ.get('BINANCE_API_KEY'),
    'secret': os.environ.get('BINANCE_SECRET'),
    'enableRateLimit': True,
})

SIMBOLO          = 'DOGE/USDT'
POSICION_ABIERTA = False
PRECIO_COMPRA    = 0.0
CANTIDAD_DOGE    = 0.0

TAKE_PROFIT_PCT  = 0.03
STOP_LOSS_PCT    = 0.02
RIESGO_PCT       = 0.80

HORAS_ACTIVAS = list(range(0, 4)) + list(range(13, 18))
LOG_FILE = "operaciones.txt"

print("BOT INTELIGENTE ACTIVADO: " + SIMBOLO)
print("Take Profit: +3% | Stop Loss: -2%")
print("Riesgo por operacion: 80% del saldo")

def calcular_ema(precios, periodo):
    k = 2 / (periodo + 1)
    ema = precios[0]
    for precio in precios[1:]:
        ema = (precio * k) + (ema * (1 - k))
    return ema

def calcular_rsi(precios, periodo=14):
    ganancias, perdidas = [], []
    for i in range(1, len(precios)):
        diff = precios[i] - precios[i - 1]
        ganancias.append(max(diff, 0))
        perdidas.append(max(-diff, 0))
    avg_g = sum(ganancias[-periodo:]) / periodo
    avg_p = sum(perdidas[-periodo:])  / periodo
    if avg_p == 0:
        return 100
    return 100 - (100 / (1 + avg_g / avg_p))

def calcular_macd(precios):
    ema12 = calcular_ema(precios, 12)
    ema26 = calcular_ema(precios, 26)
    return ema12 - ema26

def obtener_datos():
    try:
        velas          = exchange.fetch_ohlcv(SIMBOLO, timeframe='5m', limit=50)
        precios_cierre = [v[4] for v in velas]
        precio_actual  = precios_cierre[-1]
        ema9   = calcular_ema(precios_cierre[-15:], 9)
        ema21  = calcular_ema(precios_cierre, 21)
        rsi    = calcular_rsi(precios_cierre)
        macd   = calcular_macd(precios_cierre[-26:])
        return precio_actual, ema9, ema21, rsi, macd
    except Exception as e:
        print("Error obteniendo datos: " + str(e))
        return None, None, None, None, None

def es_hora_activa():
    hora_utc = datetime.now(timezone.utc).hour
    return hora_utc in HORAS_ACTIVAS

def calcular_cantidad(precio_actual):
    try:
        balance    = exchange.fetch_balance()
        saldo_usdt = balance['USDT']['free'] if 'USDT' in balance else 0.0
        if saldo_usdt < 1.0:
            return 0, saldo_usdt
        cantidad_usdt = saldo_usdt * RIESGO_PCT
        cantidad_doge = int(cantidad_usdt / precio_actual)
        return cantidad_doge, saldo_usdt
    except Exception as e:
        print("Error calculando cantidad: " + str(e))
        return 0, 0

def mostrar_saldo_actual():
    try:
        balance    = exchange.fetch_balance()
        saldo_usdt = balance['USDT']['free'] if 'USDT' in balance else 0.0
        saldo_doge = balance['DOGE']['free'] if 'DOGE' in balance else 0.0
        print("----------------------------------------")
        print("SALDO: " + str(round(saldo_usdt, 2)) + " USDT | " + str(round(saldo_doge, 2)) + " DOGE")
        print("----------------------------------------")
        return saldo_usdt
    except Exception as e:
        print("Error al obtener saldo: " + str(e))
        return 0

def registrar_operacion(tipo, precio, cantidad, motivo, ganancia=None):
    try:
        ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        linea = "[" + ahora + "] " + tipo + " | Precio: $" + str(round(precio, 5)) + " | Cantidad: " + str(int(cantidad)) + " DOGE"
        if ganancia is not None:
            signo = "+" if ganancia >= 0 else ""
            linea += " | Resultado: " + signo + str(round(ganancia, 4)) + " USDT"
        linea += " | Motivo: " + motivo + "\n"
        with open(LOG_FILE, "a") as f:
            f.write(linea)
        print("Registrado en " + LOG_FILE)
    except Exception as e:
        print("Error al registrar: " + str(e))

def vender_todo(motivo):
    global POSICION_ABIERTA, PRECIO_COMPRA, CANTIDAD_DOGE
    try:
        balance    = exchange.fetch_balance()
        saldo_doge = balance['DOGE']['free'] if 'DOGE' in balance else 0.0
        cantidad   = int(saldo_doge)
        if cantidad >= 1:
            orden        = exchange.create_market_sell_order(SIMBOLO, cantidad)
            precio_venta = exchange.fetch_ticker(SIMBOLO)['last']
            ganancia     = (precio_venta - PRECIO_COMPRA) * cantidad
            signo = "+" if ganancia >= 0 else ""
            print("Venta ejecutada (" + motivo + ") | ID: " + str(orden['id']))
            print("Resultado: " + signo + str(round(ganancia, 4)) + " USDT")
            registrar_operacion("VENTA", precio_venta, cantidad, motivo, ganancia)
            POSICION_ABIERTA = False
            PRECIO_COMPRA    = 0.0
            CANTIDAD_DOGE    = 0.0
            mostrar_saldo_actual()
        else:
            print("DOGE insuficiente: " + str(round(saldo_doge, 2)))
    except Exception as e:
        print("Error al vender: " + str(e))

# ============================================================
#   INICIO
# ============================================================
mostrar_saldo_actual()

while True:
    try:
        hora_actual = datetime.now(timezone.utc).strftime("%H:%M UTC")
        precio_actual, ema9, ema21, rsi, macd = obtener_datos()

        if None in (precio_actual, ema9, ema21, rsi, macd):
            time.sleep(10)
            continue

        print("Precio: $" + str(round(precio_actual, 5)) + " | EMA9: " + str(round(ema9, 5)) + " | EMA21: " + str(round(ema21, 5)) + " | RSI: " + str(round(rsi, 1)) + " | MACD: " + str(round(macd, 6)) + " | " + hora_actual)

        if POSICION_ABIERTA and PRECIO_COMPRA > 0:
            cambio_pct = (precio_actual - PRECIO_COMPRA) / PRECIO_COMPRA
            signo = "+" if cambio_pct >= 0 else ""
            print("Posicion abierta | Cambio: " + signo + str(round(cambio_pct * 100, 2)) + "%")

            if cambio_pct >= TAKE_PROFIT_PCT:
                print("TAKE PROFIT! +" + str(round(cambio_pct * 100, 2)) + "%")
                vender_todo("TAKE PROFIT")
                time.sleep(10)
                continue

            if cambio_pct <= -STOP_LOSS_PCT:
                print("STOP LOSS! " + str(round(cambio_pct * 100, 2)) + "%")
                vender_todo("STOP LOSS")
                time.sleep(10)
                continue

        if not es_hora_activa() and not POSICION_ABIERTA:
            print("Fuera de horario optimo (" + hora_actual + ") — esperando...")
            time.sleep(60)
            continue

        compra_ema  = ema9 > ema21
        compra_rsi  = 30 < rsi < 70
        compra_macd = macd > 0

        if compra_ema and compra_rsi and compra_macd and not POSICION_ABIERTA:
            cantidad_doge, saldo_usdt = calcular_cantidad(precio_actual)
            if cantidad_doge < 1:
                print("Saldo insuficiente: " + str(round(saldo_usdt, 2)) + " USDT")
            else:
                print("SENAL DE COMPRA | EMA OK | RSI: " + str(round(rsi, 1)) + " | MACD: " + str(round(macd, 6)))
                orden = exchange.create_market_buy_order(SIMBOLO, cantidad_doge)
                print("Compra exitosa! " + str(cantidad_doge) + " DOGE | ID: " + str(orden['id']))
                POSICION_ABIERTA = True
                PRECIO_COMPRA    = precio_actual
                CANTIDAD_DOGE    = cantidad_doge
                registrar_operacion("COMPRA", precio_actual, cantidad_doge, "EMA+RSI+MACD")
                mostrar_saldo_actual()

        elif ema9 < ema21 and POSICION_ABIERTA:
            print("SENAL DE VENTA por cruce EMA bajista")
            vender_todo("CRUCE EMA")

        elif compra_ema and not POSICION_ABIERTA:
            razones = []
            if not compra_rsi:  razones.append("RSI=" + str(round(rsi, 1)))
            if not compra_macd: razones.append("MACD=" + str(round(macd, 6)))
            print("Senal debil — " + ", ".join(razones))

    except Exception as e:
        print("Error: " + str(e))

    time.sleep(10)
