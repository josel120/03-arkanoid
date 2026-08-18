# SPEC 02 — Destrucción de bloques con animación

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-18
> **Objective:** Reproducir una animación de explosión de 4 frames en la posición de cada bloque al momento de ser destruido, usando `EXPLOSION_FRAMES`/`drawFrame` de `assets/spritesheet.js`, en vez de que el bloque desaparezca instantáneamente.

---

## Scope

**In:**

- Al destruirse un bloque (colisión bola-bloque), se reproduce una animación de 4 frames tomada de `EXPLOSION_FRAMES[block.color]` en la posición y tamaño del bloque destruido, durante `EXPLOSION_DURATION` (150ms).
- El color de la animación corresponde al color del bloque destruido (`red`, `hotpink`, `magenta`, `yellow`, `green` — los usados en el MVP).
- Soporte para múltiples animaciones de explosión simultáneas e independientes (romper varios bloques seguidos muestra varias explosiones a la vez).
- El progreso de cada animación se calcula por tiempo real transcurrido (`performance.now()`), no por conteo de frames de juego.
- Las explosiones activas se limpian al reiniciar la partida (`restartGame`).

**Out of scope (for future specs):**

- Sonido de rotura (`assets/sounds/break-sound.mp3`). Se deja para un futuro spec de audio, tal como ya definido en SPEC 01.
- Cambios a `assets/spritesheet.js` (se usa `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y `drawFrame` tal como ya existen).
- Cambios a la física de rebote bola-bloque o al sistema de puntos.

---

## Data model

```js
// js/game.js — nuevo campo en el estado del juego
state.explosions = [
  // { x, y, width, height, color, startTime }
];
```

Convenciones:

- `x, y, width, height` se copian de las dimensiones del bloque destruido (56x24 en el MVP) en el instante de la colisión.
- `startTime` es el valor de `performance.now()` capturado cuando el bloque se destruye.
- El índice de frame a dibujar se calcula como `Math.min(3, Math.floor((performance.now() - startTime) / (EXPLOSION_DURATION / 4)))`, indexando `EXPLOSION_FRAMES[color]`.
- Una explosión se remueve de `state.explosions` cuando `performance.now() - startTime >= EXPLOSION_DURATION`.

---

## Implementation plan

1. En `js/game.js`, agregar `explosions: []` al objeto `state` inicial y reiniciarlo (`state.explosions = []`) dentro de `restartGame()`. Verificación: el juego sigue funcionando igual que antes, sin cambios visibles.
2. En `checkBlockCollision`, inmediatamente después de `block.alive = false`, hacer `push` a `state.explosions` de `{ x: block.x, y: block.y, width: block.width, height: block.height, color: block.color, startTime: performance.now() }`. Verificación: no cambia el comportamiento de rebote ni de score.
3. Implementar `updateExplosions()`, llamada desde `update()` cuando `state.status === 'PLAYING'`, que filtra `state.explosions` removiendo las que ya superaron `EXPLOSION_DURATION` desde su `startTime`. Verificación: sin cambios visibles todavía (no hay dibujo aún).
4. Implementar `drawExplosions()`, llamada desde `render()` justo después de `drawBlocks()`, que recorre `state.explosions` y dibuja el frame correspondiente con `drawFrame(ctx, EXPLOSION_FRAMES[color][frameIndex], x, y, width, height)`. Verificación: al romper un bloque se ve la animación de 4 frames en su posición antes de desaparecer.
5. Probar manualmente rompiendo varios bloques en rápida sucesión y verificar que las animaciones se solapan sin interferir entre sí, y que un reinicio de partida (Game Over o Victoria → nuevo input) no deja explosiones residuales.

---

## Acceptance criteria

- [x] Al golpear un bloque, en su posición se reproduce una animación de 4 frames de `EXPLOSION_FRAMES` que dura aproximadamente 150ms antes de dejar de dibujarse.
- [x] El color de la animación corresponde al color del bloque destruido (`red`, `hotpink`, `magenta`, `yellow`, `green`).
- [x] El rebote de la bola y el incremento de score al golpear un bloque no cambian respecto al comportamiento actual (la animación es puramente visual, no afecta colisión).
- [x] Romper varios bloques en rápida sucesión muestra varias animaciones de explosión simultáneas, cada una en la posición de su propio bloque.
- [x] Al reiniciar la partida (tras Game Over o Victoria) no quedan animaciones de explosión residuales de la partida anterior.
- [x] No se agregan dependencias externas ni se modifica `assets/spritesheet.js`.

---

## Decisions

- **Sí:** calcular el frame de la animación con `performance.now()` en vez de contar frames de juego. Da timing preciso (150ms reales) independiente del framerate, y evita acoplar la animación al loop de `update()`.
- **Sí:** el bloque se vuelve completamente atravesable/invisible como bloque desde el instante del impacto (`alive = false` inmediato, igual que hoy). La explosión es un efecto visual superpuesto que no vuelve a colisionar ni retrasa el rebote.
- **Sí:** `state.explosions` como array, para soportar cualquier cantidad de explosiones simultáneas sin límite artificial.
- **No:** sonido de rotura (`break-sound.mp3`) en este spec. Queda para un spec futuro de audio, tal como ya decidido en SPEC 01.
- **No:** modificar `assets/spritesheet.js`. `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y `drawFrame` ya existen y se usan sin cambios.

---

## Risks

| Risk                                                                                                                                                                                                                                | Mitigation                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Si el jugador rompe muchos bloques muy rápido, `state.explosions` podría crecer sin control si no se limpia a tiempo.                                                                                                               | `updateExplosions()` corre cada frame en `PLAYING` y remueve por timestamp expirado, acotando cada explosión a un máximo de 150ms de vida. |
| Una explosión en curso justo cuando `state.status` pasa a `GAME_OVER` o `WIN` deja de limpiarse (`update()` solo corre en `PLAYING`), y puede quedar dibujado su último frame de forma estática hasta el siguiente `restartGame()`. | Efecto visual menor y aceptado como parte de este spec; `restartGame()` limpia `state.explosions` al iniciar una nueva partida.            |

---

## What is **not** in this spec

- Sonido de rotura de bloques.
- Cambios a `assets/spritesheet.js`.
- Cambios a la física de rebote bola-bloque o al sistema de puntos.

Cada uno de estos, si se implementa, va en su propio spec.
