# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Approved
> **Depends on:** ninguno
> **Date:** 2026-08-18
> **Objective:** Construir un Arkanoid jugable de principio a fin (pala, bola, un nivel de bloques, vidas, score, pantallas de inicio/game over/victoria) en HTML/CSS/JS vanilla sin dependencias.

---

## Scope

**In:**

- Página `index.html` en la raíz con un `<canvas>` de 480x640px centrado.
- Pala controlable con teclado (flechas izquierda/derecha y A/D) y con el mouse (sigue la posición horizontal del cursor sobre el canvas).
- Bola con movimiento continuo, rebote en paredes izquierda/superior/derecha, y rebote en la pala con ángulo dependiente del punto de impacto.
- Un único nivel fijo: grid de bloques de 5 filas x 8 columnas (40 bloques), un color distinto por fila, usando `assets/spritesheet.js` como fuente de sprites.
- Colisión bola-bloque (AABB): el bloque golpeado desaparece, la bola rebota, el score sube según el valor de puntos fijo asignado al color del bloque.
- Sistema de vidas: 3 vidas. Al caer la bola por debajo de la pala se pierde una vida y se resetean bola y pala en su posición inicial.
- HUD en el propio canvas mostrando score actual y vidas restantes durante la partida.
- Pantalla de inicio (overlay dibujado en canvas) con indicación de "presiona una tecla o haz clic para jugar".
- Pantalla de Game Over (overlay en canvas) al perder la tercera vida, con score final y reinicio de la partida al presionar una tecla o hacer clic.
- Pantalla de Victoria (overlay en canvas) al destruir los 40 bloques, con score final y reinicio de la partida al presionar una tecla o hacer clic.
- Hoja de estilos mínima (`css/style.css`) que centra el canvas sobre la página.

**Out of scope (for future specs):**

- Sonido (`assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` quedan sin usar en este MVP).
- Pausa del juego.
- Persistencia de high score (localStorage u otro medio).
- Soporte táctil/móvil.
- Múltiples niveles o generación procedural de bloques.
- Incremento de velocidad de la bola con el tiempo / dificultad progresiva.
- Power-ups.

---

## Data model

```js
// js/game.js — estado del juego
const state = {
  status: "START", // "START" | "PLAYING" | "GAME_OVER" | "WIN"
  score: 0,
  lives: 3,
  paddle: { x, y, width: 90, height: 14 }, // origen top-left
  ball: { x, y, width: 14, height: 14, dx, dy }, // velocidades en px/frame
  blocks: [
    // { x, y, width: 56, height: 24, color: "red", points: 70, alive: true }
  ],
};

// Puntos fijos por color de bloque (una fila = un color)
const BLOCK_POINTS = {
  red: 70,
  hotpink: 60,
  magenta: 50,
  yellow: 40,
  green: 30,
};
```

Convenciones:

- Coordenadas: origen top-left del canvas (0,0).
- Velocidades en píxeles/frame, actualizadas vía `requestAnimationFrame`.
- Los colores de bloque usados (`red`, `hotpink`, `magenta`, `yellow`, `green`) corresponden a las claves `block_red`, `block_hotpink`, etc. de `assets/spritesheet.js`. `cyan` y `gray` quedan sin usar en este MVP.

---

## Implementation plan

1. Crear `index.html` en la raíz con un `<canvas id="gameCanvas" width="480" height="640">`, cargando `assets/spritesheet.js` y `js/game.js` como `<script>` clásicos (en ese orden), y `css/style.css` que centra el canvas sobre fondo oscuro. Verificación: abrir con `python -m http.server 8000` muestra un canvas vacío sin errores en consola.
2. En `js/game.js`, llamar a `loadSpritesheet` y, dentro del callback, arrancar el loop con `requestAnimationFrame` que dibuja el estado `START`: fondo, sprite de pala y bola estáticos, y texto "Presiona una tecla o haz clic para jugar". Verificación: los sprites se ven nítidos en las posiciones esperadas.
3. Implementar el objeto `paddle` con movimiento por teclado (flechas/A-D) y por mouse (clamp a los límites del canvas), y el objeto `ball` con movimiento y rebote en paredes izquierda/superior/derecha (sin bloques ni pala todavía, solo transición START→PLAYING al primer input). Verificación: tras iniciar, la bola rebota libremente en las tres paredes.
4. Implementar la colisión bola-pala con reflexión de ángulo según el punto de impacto (relativo al centro de la pala). Verificación: golpear cerca del borde de la pala desvía la bola en un ángulo visiblemente distinto que golpear en el centro.
5. Generar el grid de 40 bloques (5x8) al iniciar/reiniciar una partida, con color y puntos fijos por fila, y dibujarlos con `drawSprite`. Implementar colisión bola-bloque (AABB): al impactar, el bloque se marca `alive = false`, deja de dibujarse y de colisionar, la bola rebota, y `state.score` aumenta según `BLOCK_POINTS[color]`. Verificación: al golpear un bloque, este desaparece y el score del HUD sube el valor correcto.
6. Implementar el HUD (score y vidas) dibujado en la parte superior del canvas durante `PLAYING`, y la lógica de vida perdida: si `ball.y` supera el borde inferior del canvas, `state.lives` decrece, y bola/pala se resetean a su posición inicial (blocks conservan su estado). Si `lives` llega a 0, `state.status = "GAME_OVER"`. Verificación: dejar caer la bola 3 veces sin bloquear con la pala muestra la pantalla de Game Over con el score final.
7. Implementar la transición a `WIN` cuando no queda ningún bloque `alive`, dibujando el overlay de victoria con el score final. Implementar el reinicio completo de partida (score, vidas, bola, pala, blocks) al presionar una tecla o hacer clic estando en `GAME_OVER` o `WIN`, volviendo a `PLAYING`. Verificación: romper los 40 bloques muestra la pantalla de Victoria, y un input reinicia la partida desde cero.

---

## Acceptance criteria

- [ ] Abrir `index.html` vía servidor estático (`python -m http.server`) muestra el canvas 480x640 centrado con la pantalla de inicio, sin errores en consola.
- [ ] Al presionar una tecla o hacer clic en la pantalla de inicio, comienza la partida: la bola se mueve, se ven los 40 bloques (5 filas x 8 columnas) y el HUD muestra score=0 y vidas=3.
- [ ] La pala se mueve con flechas izquierda/derecha, A/D y con el mouse, sin salir de los límites del canvas.
- [ ] La bola rebota correctamente en las paredes izquierda, superior y derecha, y en la pala con un ángulo que depende del punto de impacto.
- [ ] Al golpear un bloque, este desaparece, la bola rebota, y el score del HUD aumenta exactamente el valor de puntos asignado al color de ese bloque.
- [ ] Si la bola cae por debajo de la pala, se pierde una vida, el HUD refleja las vidas restantes, y bola/pala vuelven a su posición inicial.
- [ ] Al perder la tercera vida aparece la pantalla de Game Over con el score final; presionar una tecla o hacer clic reinicia la partida completa (score=0, vidas=3, 40 bloques de nuevo).
- [ ] Al destruir los 40 bloques aparece la pantalla de Victoria con el score final; presionar una tecla o hacer clic reinicia la partida completa.
- [ ] No se agregan dependencias externas: sin `npm`, sin CDN, sin bundlers; todo corre con `<script>` clásicos y `assets/spritesheet.js` se usa sin modificar su formato de globals (`SPRITES`, `loadSpritesheet`, `drawSprite`).

---

## Decisions

- **Sí:** un único nivel fijo (5x8 bloques). Es lo mínimo para tener un juego jugable de punta a punta; múltiples niveles quedan para un spec futuro.
- **Sí:** controles de pala por teclado y mouse simultáneamente. Más accesible sin costo relevante de implementación.
- **Sí:** rebote de bola en la pala con ángulo según punto de impacto. Se siente como el Arkanoid clásico y da control real al jugador.
- **Sí:** puntaje fijo por color de bloque (no por fila ni uniforme). Da variedad estratégica manteniendo la regla simple.
- **Sí:** menús (inicio/game over/victoria) dibujados directamente en el canvas, no como overlays DOM/CSS. Mantiene toda la lógica de juego en un único `js/game.js`, según lo decidido para la organización del código.
- **No:** sonido en este MVP. `ball-bounce.mp3` y `break-sound.mp3` quedan disponibles para un spec futuro de audio.
- **No:** pausa. Fuera de alcance para simplificar el MVP.
- **No:** persistencia de high score. Sin localStorage; se puede añadir en un spec futuro.
- **No:** soporte táctil/móvil. El MVP se juega en escritorio.
- **No:** incremento de velocidad de la bola con el tiempo. Mantiene la física simple y predecible para el MVP; candidato a un spec futuro de dificultad progresiva.

---

## Risks

| Risk                                                                                                       | Mitigation                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colisión AABB simple puede "tunelizar" la bola a través de un bloque a velocidades altas o frame rate bajo | Mantener velocidad de bola moderada y constante (sin incremento progresivo) para este MVP; revisar con un spec futuro si se añade dificultad progresiva. |
| `drawSprite`/`drawFrame` son no-op silenciosos antes de que cargue el spritesheet                          | El loop de juego arranca únicamente dentro del callback de `loadSpritesheet`, tal como indica `CLAUDE.md`.                                               |

---

## What is **not** in this spec

- Sonido (efectos de rebote y rotura de bloques).
- Pausa del juego.
- Persistencia de high score.
- Soporte táctil/móvil.
- Múltiples niveles o generación procedural de bloques.
- Incremento de velocidad de la bola / dificultad progresiva.
- Power-ups.

Cada uno de estos, si se implementa, va en su propio spec.
