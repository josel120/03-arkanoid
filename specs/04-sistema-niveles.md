# SPEC 04 — Sistema de 5 niveles

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-08-18
> **Objective:** Reemplazar el nivel único del MVP por una secuencia de 5 niveles con distinto patrón de bloques cada uno, conservando score y vidas entre niveles y mostrando una pantalla de Victoria final tras completar el quinto.

---

## Scope

**In:**

- 5 niveles fijos, codeados a mano en `js/game.js`, cada uno con su propio patrón de bloques (grid de 5 filas x 8 columnas, igual dimensión que el MVP) definiendo qué celdas tienen bloque y de qué color, y cuáles quedan vacías.
- Los 5 colores existentes (`red`, `hotpink`, `magenta`, `yellow`, `green`) y sus puntos (`BLOCK_POINTS`) se mantienen sin cambios; solo varía qué celdas tienen bloque y de qué color en cada nivel.
- La velocidad de la bola y las reglas de rebote/puntaje no cambian entre niveles.
- `state.level` (1 a 5) indica el nivel actual, mostrado en el HUD junto a score y vidas (`Nivel X/5`).
- Al destruir todos los bloques de un nivel que no sea el 5º, el juego pasa a un estado de transición (`LEVEL_TRANSITION`) que muestra un overlay breve ("Nivel X completado" + indicación de continuar). Al presionar una tecla o hacer clic, se genera el nivel siguiente (`state.level += 1`) y la partida continúa en `PLAYING`, conservando `score` y `lives` y reseteando bola/pala a su posición inicial.
- Al destruir todos los bloques del 5º nivel, el juego pasa a `WIN` mostrando el overlay de Victoria existente con el score final acumulado de los 5 niveles.
- Perder la tercera vida en cualquier nivel dispara `GAME_OVER` igual que en el MVP, sin importar en qué nivel ocurra.
- Reiniciar la partida (input en `GAME_OVER` o `WIN`) vuelve a `state.level = 1` además de resetear score, vidas y bloques, igual que hoy.

**Out of scope (for future specs):**

- Generación procedural o aleatoria de niveles.
- Más de 5 niveles o selección de nivel por el jugador.
- Aumento de velocidad de bola u otra dificultad progresiva entre niveles.
- Reseteo de vidas al pasar de nivel (las vidas se conservan, no se reponen a 3).
- Persistencia de progreso entre sesiones (localStorage).
- Power-ups o cualquier otro elemento de juego nuevo.

---

## Data model

```js
// js/game.js
// LEVELS[i] es un grid de 5 filas x 8 columnas para el nivel i+1.
// Cada celda es un color ('red' | 'hotpink' | 'magenta' | 'yellow' | 'green') o null (sin bloque).
const LEVELS = [
  /* Nivel 1 */ [
    /* 5 arrays de 8 celdas */
  ],
  /* Nivel 2 */ [
    /* ... */
  ],
  /* Nivel 3 */ [
    /* ... */
  ],
  /* Nivel 4 */ [
    /* ... */
  ],
  /* Nivel 5 */ [
    /* ... */
  ],
];

// game state
const state = {
  status: "START", // "START" | "PLAYING" | "LEVEL_TRANSITION" | "GAME_OVER" | "WIN"
  level: 1, // 1..5
  score: 0,
  lives: 3,
  // paddle, ball, blocks, explosions: sin cambios de forma respecto a SPEC 01/02
};
```

Convenciones:

- `createBlocks(level)` reemplaza a `createBlocks()`: recorre `LEVELS[level - 1]` fila por columna y agrega un bloque a `state.blocks` solo si la celda no es `null` (usando el color de la celda y `BLOCK_POINTS[color]` para los puntos); las celdas `null` no generan bloque ni colisión.
- Las dimensiones y posicionamiento de cada bloque (`BLOCK_WIDTH`, `BLOCK_HEIGHT`, `BLOCK_GAP`, `BLOCK_TOP_OFFSET`, centrado horizontal) se mantienen exactamente igual que en SPEC 01; solo cambia qué celdas se instancian y con qué color.
- `state.level` es 1-indexado (`1` a `5`), coincidiendo con la posición humana-legible mostrada en el HUD y en el overlay de transición.

---

## Implementation plan

1. En `js/game.js`, definir la constante `LEVELS` con los 5 grids (5x8), cada uno visualmente distinto de los demás (variando huecos y/o el color por celda) usando únicamente los 5 colores ya existentes. Verificación: el archivo sigue cargando sin errores de sintaxis; el juego aún no usa `LEVELS` todavía.
2. Modificar `createBlocks()` para que reciba `level` como parámetro y construya `state.blocks` a partir de `LEVELS[level - 1]`, omitiendo las celdas `null`. Actualizar `state.level = 1` en el estado inicial y las llamadas a `createBlocks(state.level)` en la inicialización de `state.blocks`. Verificación: al abrir el juego se ve el patrón del Nivel 1 en vez del grid completo de 5x8 uniforme.
3. En `checkWinCondition()`, cuando todos los bloques estén `!alive`: si `state.level < 5`, poner `state.status = 'LEVEL_TRANSITION'`; si `state.level === 5`, poner `state.status = 'WIN'` como hoy. Verificación: al romper todos los bloques del Nivel 1, el juego queda en pausa (sin overlay dibujado todavía) en vez de mostrar Victoria.
4. Implementar `drawLevelTransitionOverlay()` (mismo estilo visual que `drawGameOverOverlay`/`drawWinOverlay`) mostrando `Nivel {state.level} completado` y la indicación de continuar, y llamarla desde `render()` cuando `state.status === 'LEVEL_TRANSITION'`. Verificación: al romper todos los bloques del Nivel 1 se ve el overlay de transición con el texto correcto.
5. En `handleInput()`, agregar la rama para `state.status === 'LEVEL_TRANSITION'`: incrementar `state.level`, regenerar `state.blocks = createBlocks(state.level)`, resetear bola y pala con `resetBallAndPaddle()`, y volver a `state.status = 'PLAYING'` (conservando `score` y `lives`). Verificación: tras el overlay de transición, una tecla o clic muestra el Nivel 2 con el score y vidas previos intactos.
6. Actualizar `drawHUD()` para mostrar `Nivel: {state.level}/5` junto al score y las vidas. Actualizar `restartGame()` para resetear `state.level = 1` además de lo que ya resetea. Verificación: jugar los 5 niveles completos muestra el HUD correcto en cada uno, y tras un Game Over o Victoria, reiniciar vuelve al Nivel 1 con el HUD en `Nivel: 1/5`.

---

## Acceptance criteria

- [ ] Al iniciar la partida se ve el patrón de bloques del Nivel 1, distinto del grid uniforme original del MVP.
- [ ] El HUD muestra `Nivel: X/5` junto al score y las vidas durante `PLAYING`.
- [ ] Al destruir todos los bloques de un nivel que no sea el 5º, aparece un overlay de transición indicando el nivel completado; presionar una tecla o hacer clic genera el siguiente nivel y vuelve a `PLAYING`.
- [ ] Al pasar de un nivel al siguiente, `score` y `lives` conservan su valor exacto previo (no se resetean).
- [ ] Cada uno de los 5 niveles tiene un patrón de bloques visualmente distinto de los otros 4.
- [ ] Al destruir todos los bloques del Nivel 5, aparece la pantalla de Victoria existente con el score final acumulado de los 5 niveles.
- [ ] Perder la tercera vida en cualquier nivel (1 a 5) muestra Game Over con el score acumulado hasta ese momento, igual que en el MVP.
- [ ] Reiniciar la partida desde Game Over o Victoria vuelve al Nivel 1 (`Nivel: 1/5` en el HUD) con score en 0 y 3 vidas.
- [ ] No se agregan dependencias externas ni se modifica `assets/spritesheet.js`.

---

## Decisions

- **Sí:** 5 grids fijos codeados a mano en `js/game.js`, en vez de generación procedural. Da control visual exacto sobre cada nivel sin necesidad de un algoritmo de generación.
- **Sí:** mantener el grid en 5 filas x 8 columnas para los 5 niveles, variando solo qué celdas tienen bloque y de qué color. Reutiliza el posicionamiento/centrado ya implementado en SPEC 01 sin tener que generalizarlo a tamaños de grid variables.
- **Sí:** conservar `score` y `lives` entre niveles. Refuerza que el objetivo es completar los 5 niveles con la misma vida/puntaje, no reiniciar la dificultad en cada uno.
- **Sí:** overlay de transición con pausa por input (mismo patrón que Game Over/Victoria) en vez de avance instantáneo. Da feedback claro de progreso y es consistente con los overlays ya existentes.
- **Sí:** Victoria final solo tras el Nivel 5, reutilizando el overlay de Victoria existente sin cambios visuales, mostrando el score acumulado total.
- **No:** velocidad de bola creciente por nivel. Mantiene la física idéntica al MVP; queda para un spec futuro de dificultad progresiva si se pide.
- **No:** reponer vidas a 3 en cada nivel nuevo. Las vidas se conservan tal cual, aumentando la exigencia de completar los 5 niveles con el mismo margen de error.
- **No:** selección de nivel o niveles generados aleatoriamente. Fuera de alcance de este spec.

---

## What is **not** in this spec

- Generación procedural o aleatoria de niveles.
- Más de 5 niveles o selección manual de nivel por el jugador.
- Aumento de velocidad de bola u otra dificultad progresiva entre niveles.
- Reseteo de vidas al pasar de nivel.
- Persistencia de progreso entre sesiones.
- Power-ups.

Cada uno de estos, si se implementa, va en su propio spec.
