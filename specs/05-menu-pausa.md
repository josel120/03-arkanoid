# SPEC 05 — Menú de pausa

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-08-18
> **Objective:** Permitir pausar la partida con Escape o P durante `PLAYING` y mostrar un menú con las opciones Continuar, Reiniciar nivel, Elegir nivel y Terminar partida, navegable con teclado y mouse.

---

## Scope

**In:**

- Presionar `Escape` o `P` durante `state.status === 'PLAYING'` pausa el juego: transiciona a un nuevo estado `PAUSED` que congela bola, pala y explosiones (reutilizando el gating existente de `update()`, que ya solo corre en `PLAYING`).
- Overlay de pausa con 4 opciones en este orden: **Continuar**, **Reiniciar nivel**, **Elegir nivel**, **Terminar partida**.
- Navegación por teclado dentro del menú: `ArrowUp`/`ArrowDown` mueven el resaltado cíclicamente entre las 4 opciones; `Enter` o `Espacio` confirman la opción resaltada.
- Navegación por mouse: hacer clic sobre el texto de una opción la ejecuta de inmediato, sin depender de cuál esté resaltada por teclado.
- El resaltado visual es texto en color distinto + prefijo `'> '` antes de la opción activa (sin rectángulos de fondo).
- **Continuar:** vuelve a `PLAYING` exactamente en el mismo estado en que se pausó (nivel, score, vidas, posición de bola/pala/bloques intactos). Equivalente a presionar `Escape`/`P` de nuevo estando en `PAUSED`.
- **Reiniciar nivel:** reconstruye `state.blocks` a partir de `LEVELS[state.level - 1]` y reposiciona bola/pala con `resetBallAndPaddle()`, conservando `score` y `lives` sin cambios, y vuelve a `PLAYING`.
- **Elegir nivel:** transiciona a un nuevo estado `PAUSED_LEVEL_SELECT` que muestra una lista de los 5 niveles (`Nivel 1` a `Nivel 5`), resaltando por defecto el nivel actual (`state.level`). Cualquiera de los 5 es seleccionable libremente, sin importar el progreso de la partida.
  - Misma mecánica de navegación que el menú de pausa (`ArrowUp`/`ArrowDown` + `Enter`/`Espacio`, clic directo, resaltado con `'> '` + color).
  - Confirmar un nivel resetea `score` a `0` y `lives` a `3`, construye los bloques de ese nivel, reposiciona bola/pala, y pasa a `PLAYING`.
  - `Escape`/`P` en esta sub-pantalla cancela y vuelve al menú de pausa (`PAUSED`), sin modificar nada.
- **Terminar partida:** transiciona directamente a `state.status = 'GAME_OVER'`, reutilizando el overlay de Game Over existente con el `score` acumulado hasta el momento de pausar.
- `Escape`/`P` no tienen ningún efecto durante `START`, `GAME_OVER`, `WIN` o `LEVEL_TRANSITION` (el flujo existente de esos estados no cambia).

**Out of scope (for future specs):**

- Pausar durante `LEVEL_TRANSITION`, `GAME_OVER`, `WIN` o `START`.
- Diálogo de confirmación ("¿Seguro que quieres terminar la partida?").
- Bloqueo/desbloqueo de niveles según progreso (todos los 5 niveles están siempre disponibles en "Elegir nivel").
- Persistencia de score, nivel o progreso entre sesiones (localStorage).
- Sonido específico para navegación de menú o pausa.
- Soporte de gamepad/touch.
- Congelar el reloj de las explosiones en curso al pausar (ver Riesgos).

---

## Data model

```js
// js/game.js
const PAUSE_MENU_OPTIONS = ['Continuar', 'Reiniciar nivel', 'Elegir nivel', 'Terminar partida'];

// game state (nuevos campos)
const state = {
  status: 'START', // "START" | "PLAYING" | "PAUSED" | "PAUSED_LEVEL_SELECT" | "LEVEL_TRANSITION" | "GAME_OVER" | "WIN"
  pauseMenuIndex: 0, // 0..3, opción resaltada en el menú de pausa
  levelSelectIndex: 0, // 0..4, nivel resaltado en la sub-pantalla de selección
  // resto de campos: sin cambios respecto a SPEC 01/02/04
};
```

Convenciones:

- `pauseMenuIndex` y `levelSelectIndex` son índices 0-based; se mapean a `PAUSE_MENU_OPTIONS[i]` y a "Nivel `i + 1`" respectivamente.
- Al entrar a `PAUSED` desde `PLAYING`, `pauseMenuIndex` se reinicia a `0` (Continuar resaltado).
- Al entrar a `PAUSED_LEVEL_SELECT` desde el menú de pausa, `levelSelectIndex` se inicializa en `state.level - 1` (resalta el nivel actual).
- Los rects de hit-testing del mouse para cada opción dibujada se recalculan en cada `render()` y se guardan en arrays de módulo (`pauseMenuRects`, `levelSelectRects`), cada entrada `{ x, y, width, height, index }`.

---

## Implementation plan

1. Agregar `'PAUSED'` al enum de estados y `state.pauseMenuIndex = 0`. En `handleKeyDown`, cuando `state.status === 'PLAYING'` y la tecla es `Escape`/`p`/`P`, pasar a `state.status = 'PAUSED'` (reiniciando `pauseMenuIndex = 0`) en vez de llamar a `handleInput()`; cuando `state.status === 'PAUSED'` y la tecla es `Escape`/`p`/`P`, volver a `'PLAYING'`. Agregar `drawPauseOverlay()` simple (fondo semitransparente + texto "Pausa" + "Presiona Escape para continuar") llamado desde `render()` cuando `status === 'PAUSED'`. Verificación: presionar Escape o P durante la partida congela bola y pala y muestra "Pausa"; presionarla de nuevo reanuda exactamente donde quedó.
2. Reemplazar el overlay simple por el menú completo: dibujar las 4 `PAUSE_MENU_OPTIONS` centradas verticalmente, resaltando `state.pauseMenuIndex` con prefijo `'> '` y color distinto; guardar sus rects en `pauseMenuRects`. En `handleKeyDown`, cuando `status === 'PAUSED'`, `ArrowUp`/`ArrowDown` mueven `pauseMenuIndex` cíclicamente (módulo 4). Crear `confirmPauseMenuSelection()` que por ahora solo maneja el índice `0` (Continuar → `status = 'PLAYING'`) y el índice `3` (Terminar partida → `status = 'GAME_OVER'`); invocarla con `Enter`/`Espacio` en `handleKeyDown`, y también reemplazar el listener de clic del canvas por `handleCanvasClick(e)` que, si `status === 'PAUSED'`, revisa `pauseMenuRects` bajo el mouse y llama `confirmPauseMenuSelection()` con ese índice; si no, delega a la lógica de clic existente (`handleInput()`). Verificación: en pausa, las flechas mueven el resaltado entre las 4 opciones; Enter o clic sobre "Continuar" reanuda; Enter o clic sobre "Terminar partida" muestra Game Over con el score correcto; las opciones 1 y 2 aún no hacen nada.
3. Implementar la rama del índice `1` (Reiniciar nivel) en `confirmPauseMenuSelection()`: `state.blocks = createBlocks(state.level)`, `state.explosions = []`, `resetBallAndPaddle()`, `state.status = 'PLAYING'`, conservando `score` y `lives`. Verificación: en pausa, seleccionar "Reiniciar nivel" (teclado o clic) reconstruye los bloques del nivel actual y reposiciona bola/pala, sin tocar score ni vidas.
4. Agregar `'PAUSED_LEVEL_SELECT'` al enum y `state.levelSelectIndex = 0`. Implementar la rama del índice `2` (Elegir nivel) en `confirmPauseMenuSelection()`: `state.levelSelectIndex = state.level - 1`, `state.status = 'PAUSED_LEVEL_SELECT'`. Implementar `drawLevelSelectOverlay()` (lista "Nivel 1".."Nivel 5", mismo estilo de resaltado, rects en `levelSelectRects`) llamada desde `render()` para ese estado. En `handleKeyDown`, cuando `status === 'PAUSED_LEVEL_SELECT'`: `ArrowUp`/`ArrowDown` mueven `levelSelectIndex` cíclicamente (módulo 5); `Escape`/`p`/`P` vuelven a `status = 'PAUSED'` sin cambiar nada más; `Enter`/`Espacio` llaman `confirmLevelSelectSelection()`. Esta función hace `state.level = state.levelSelectIndex + 1`, `state.score = 0`, `state.lives = 3`, `state.blocks = createBlocks(state.level)`, `state.explosions = []`, `resetBallAndPaddle()`, `state.status = 'PLAYING'`. Extender `handleCanvasClick` para que, en `PAUSED_LEVEL_SELECT`, revise `levelSelectRects` y llame `confirmLevelSelectSelection()` con el índice bajo el mouse. Verificación: seleccionar "Elegir nivel" abre la lista de 5 niveles resaltando el actual; navegar y confirmar (teclado o clic) un nivel distinto resetea score a 0, vidas a 3, construye ese nivel y vuelve a jugar; Escape/P en esta pantalla regresa al menú de pausa sin cambios.

---

## Acceptance criteria

- [x] Presionar `Escape` o `P` durante `PLAYING` pausa el juego (bola y pala quedan congeladas) y muestra el overlay de pausa.
- [x] El overlay de pausa muestra las 4 opciones en orden: Continuar, Reiniciar nivel, Elegir nivel, Terminar partida.
- [x] Con el menú de pausa abierto, `ArrowUp`/`ArrowDown` mueven el resaltado (`'> '` + color) cíclicamente entre las 4 opciones.
- [x] Hacer clic sobre una opción del menú de pausa la ejecuta de inmediato, sin importar cuál esté resaltada por teclado.
- [x] Seleccionar "Continuar" (Enter, clic, o presionar `Escape`/`P` de nuevo) reanuda el juego exactamente en el mismo estado (score, vidas, nivel, posición de bola/pala/bloques) en que se pausó.
- [x] Seleccionar "Reiniciar nivel" reconstruye los bloques del nivel actual y reposiciona bola/pala en su punto inicial, conservando score y vidas, y vuelve a `PLAYING`.
- [x] Seleccionar "Elegir nivel" abre una sub-pantalla con los 5 niveles listados, resaltando por defecto el nivel actual.
- [x] En la sub-pantalla de elegir nivel, `ArrowUp`/`ArrowDown` navegan la lista, `Enter`/`Espacio` o clic confirman el nivel elegido, y `Escape`/`P` vuelve al menú de pausa sin cambiar nada.
- [x] Confirmar un nivel en la sub-pantalla resetea score a `0` y vidas a `3`, construye los bloques de ese nivel, reposiciona bola/pala, y pasa a `PLAYING`.
- [x] Seleccionar "Terminar partida" (Enter, Espacio o clic) muestra la pantalla de Game Over existente con el score acumulado hasta el momento de pausar.
- [x] `Escape`/`P` no tienen ningún efecto durante `GAME_OVER`, `WIN`, `START` o `LEVEL_TRANSITION`.
- [x] No se agregan dependencias externas ni se modifica `assets/spritesheet.js`.

---

## Decisions

- **Sí:** `Escape` y `P` ambas activan/desactivan la pausa. Cubre tanto la convención estándar de juegos (`Escape`) como un atajo mnemotécnico (`P` de "Pause").
- **Sí:** navegación híbrida teclado + mouse en ambos menús, con clic ejecutando la opción de inmediato independientemente del resaltado por teclado. Evita tener que sincronizar hover del mouse con el índice resaltado, manteniendo la implementación simple.
- **Sí:** resaltado con `'> '` + color de texto distinto, sin rectángulos de fondo. Más simple de dibujar en canvas 2D que gestionar geometría de fondo; los rects para hit-testing del mouse existen igual mas invisibles.
- **Sí:** "Reiniciar nivel" conserva `score` y `lives` intactos. Es fiel al significado de "reiniciar el nivel" sin penalizar al jugador como si hubiera perdido.
- **Sí:** "Elegir nivel" permite cualquiera de los 5 niveles sin restricción de desbloqueo. No existe persistencia de progreso entre sesiones (SPEC 04), así que no hay concepto de "nivel alcanzado" que trackear.
- **Sí:** confirmar un nivel en "Elegir nivel" resetea `score` a `0` y `lives` a `3`. Equivale a empezar una partida nueva directamente en ese nivel, evitando ambigüedad sobre qué score "le pertenece" a un salto arbitrario de nivel.
- **Sí:** "Terminar partida" lleva a `GAME_OVER` con el score actual, en vez de volver a `START` sin mostrar nada. Trata la salida voluntaria como el mismo cierre de partida que una derrota, reutilizando el overlay existente sin agregar una pantalla nueva.
- **Sí:** pausa solo disponible durante `PLAYING`. `GAME_OVER`, `WIN`, `START` y `LEVEL_TRANSITION` ya son pantallas de interrupción con su propia interacción de una sola tecla/clic; pausarlas no aporta nada y complica la máquina de estados.
- **Sí:** cancelar en "Elegir nivel" (`Escape`/`P`) vuelve al menú de pausa, no directo a `PLAYING`. Consistente con un flujo de sub-menús donde cada `Escape` retrocede un nivel de navegación.
- **No:** diálogo de confirmación antes de "Terminar partida". Agrega un estado y una interacción extra sin que el usuario lo haya pedido; se puede agregar en un spec futuro si se nota necesario.
- **No:** congelar el reloj (`performance.now()`) de las explosiones en curso al entrar en pausa. Ver riesgo abajo; se acepta como comportamiento conocido en vez de agregar un mecanismo de pausa de temporizador para un caso de borde poco frecuente.

---

## Risks

| Risk                                                                                                                                                 | Mitigation                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Las explosiones usan `performance.now()` como timestamp absoluto; si se pausa justo cuando una explosión está en curso y se permanece en pausa mucho tiempo, al reanudar la animación puede saltar directamente al final o desaparecer en vez de reproducirse cuadro a cuadro. | Aceptado como glitch visual menor y poco frecuente (ventana de pausa coincidiendo con una explosión de 150ms). Fuera de alcance arreglarlo en este spec; se puede revisar si se reporta como molesto. |

---

## What is **not** in this spec

- Pausar durante `LEVEL_TRANSITION`, `GAME_OVER`, `WIN` o `START`.
- Diálogo de confirmación al terminar partida.
- Bloqueo/desbloqueo de niveles por progreso.
- Persistencia de score, nivel o progreso entre sesiones.
- Sonido de navegación de menú.
- Soporte de gamepad o touch.

Cada uno de estos, si se implementa, va en su propio spec.
