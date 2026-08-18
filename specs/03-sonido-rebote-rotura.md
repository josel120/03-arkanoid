# SPEC 03 — Sonido de rebote y rotura de bloques

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-08-18
> **Objective:** Reproducir `assets/sounds/ball-bounce.mp3` en cada rebote de la bola (paredes y pala) y `assets/sounds/break-sound.mp3` al destruirse un bloque, usando `<audio>`/`Audio` nativo sin dependencias.

---

## Scope

**In:**

- Al rebotar la bola en la pared izquierda, superior, derecha, o en la pala (`reflectOffPaddle`), se reproduce `assets/sounds/ball-bounce.mp3`.
- Al destruirse un bloque en `checkBlockCollision` (cuando `block.alive` pasa a `false`), se reproduce `assets/sounds/break-sound.mp3` en vez de `ball-bounce.mp3` (no ambos a la vez para ese mismo evento).
- Ambos audios se precargan (se crean los objetos `Audio` y se dispara su carga) junto con `loadSpritesheet`, antes de que arranque el loop del juego.
- Si un efecto se dispara mientras su audio anterior sigue sonando, se corta el anterior y se reproduce el nuevo desde el inicio (un único elemento `Audio` reutilizado por efecto, con `currentTime = 0` antes de cada `play()`).
- Los sonidos se reproducen siempre a volumen por defecto, sin control de mute/volumen en la UI.

**Out of scope (for future specs):**

- Control de mute/volumen accesible al jugador (botón, tecla, o UI de ajustes).
- Sonido solapado/múltiples instancias simultáneas del mismo efecto (audio pooling).
- Música de fondo o cualquier otro efecto de sonido distinto de rebote y rotura.
- Cambios a `assets/spritesheet.js`.
- Cambios a la física de rebote o al sistema de puntos.

---

## Data model

Esta feature no introduce nuevas estructuras en `state`. Agrega dos constantes de módulo en `js/game.js`:

```js
const ballBounceSound = new Audio("assets/sounds/ball-bounce.mp3");
const breakSound = new Audio("assets/sounds/break-sound.mp3");

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
```

Convenciones:

- `playSound` reinicia el audio (`currentTime = 0`) antes de reproducirlo, de modo que un evento nuevo del mismo efecto corta al anterior en vez de solaparse.
- El `.catch(() => {})` absorbe el rechazo de la promise de `play()` si el navegador la interrumpe (p. ej. por una llamada a `play()` superpuesta), sin lanzar error ni afectar el loop del juego.

---

## Implementation plan

1. En `js/game.js`, declarar `ballBounceSound`, `breakSound` y la función `playSound(audio)` junto a las demás constantes del archivo. Verificación: el juego sigue funcionando igual que antes, sin cambios visibles ni errores en consola.
2. Llamar `playSound(ballBounceSound)` en `updateBall()` en los tres puntos de rebote de pared (izquierda, superior, derecha) y justo después de `reflectOffPaddle(ball)` cuando la bola colisiona con la pala. Verificación: al jugar, se oye el sonido de rebote al golpear cualquier pared o la pala.
3. Llamar `playSound(breakSound)` en `checkBlockCollision()` inmediatamente después de `block.alive = false`. Verificación: al romper un bloque se oye el sonido de rotura junto con la animación de explosión existente, y no se oye el sonido de rebote de pared/pala en ese mismo golpe.
4. Probar manualmente: rebotes consecutivos rápidos en pared/pala, y roturas de varios bloques seguidos, verificando que cada nuevo evento del mismo efecto corta el sonido anterior y empieza desde el inicio, sin errores en consola.

---

## Acceptance criteria

- [ ] Al rebotar la bola en la pared izquierda, superior, derecha, o en la pala, se reproduce `ball-bounce.mp3`.
- [ ] Al destruirse un bloque, se reproduce `break-sound.mp3` y no `ball-bounce.mp3` para ese mismo evento de colisión.
- [ ] Un nuevo rebote mientras `ball-bounce.mp3` sigue sonando corta el sonido en curso y lo reproduce de nuevo desde el inicio; lo mismo aplica a roturas consecutivas con `break-sound.mp3`.
- [ ] Los objetos `Audio` se crean y empiezan a precargarse junto con `loadSpritesheet`, antes de que arranque `requestAnimationFrame(loop)`.
- [ ] No hay ningún control de mute/volumen visible en el juego; los sonidos siempre están activos a volumen por defecto.
- [ ] No se agregan dependencias externas ni se modifica `assets/spritesheet.js`.

---

## Decisions

- **Sí:** un único elemento `Audio` reutilizado por efecto, reiniciando `currentTime = 0` en cada evento en vez de crear una instancia nueva por reproducción. Es más simple y evita gestionar un pool de instancias; el corte de sonido en eventos muy rápidos es aceptable para este spec.
- **Sí:** precargar los audios junto con el spritesheet. Evita silencio o delay perceptible en el primer rebote de la partida.
- **Sí:** distinguir el sonido de bloque (`break-sound.mp3`) del sonido de pared/pala (`ball-bounce.mp3`). Da feedback distinto entre "reboté" y "rompí un bloque".
- **No:** control de mute/volumen en este spec. Se puede agregar en un spec futuro si se pide.
- **No:** audio pooling para permitir solapamiento del mismo efecto. Innecesario para el alcance actual; se puede reconsiderar si se pide explícitamente.

---

## Risks

| Risk                                                                                                                             | Mitigation                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las políticas de autoplay del navegador pueden bloquear `audio.play()` si no hubo interacción previa del usuario.                | El primer input (tecla o clic) ya transiciona `START` → `PLAYING` antes de que ocurra cualquier rebote, por lo que siempre hay interacción previa. |
| Llamar `audio.play()` mientras una llamada anterior no resolvió su promise puede rechazarla y lanzar una excepción no capturada. | `playSound` encadena `.catch(() => {})` a `play()`, absorbiendo el rechazo sin interrumpir el loop del juego.                                      |

---

## What is **not** in this spec

- Control de mute/volumen en UI.
- Solapamiento de instancias del mismo efecto de sonido (audio pooling).
- Música de fondo u otros efectos de sonido.
- Cambios a `assets/spritesheet.js`.
- Cambios a la física de rebote o al sistema de puntos.

Cada uno de estos, si se implementa, va en su propio spec.
