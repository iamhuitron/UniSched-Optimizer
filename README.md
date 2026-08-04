# horario-óptimo

Sube el PDF (o foto) de los horarios que publica tu universidad, dile tus restricciones —
a qué hora quieres entrar, a qué hora salir, qué días quieres libres— y te regresa las
mejores combinaciones de grupos posibles, sin choques. O si prefieres el control total,
arma tu horario a mano, grupo por grupo, y te avisamos en vivo si algo se empalma.

Nació de armar a mano el horario de 3er semestre de Informática en FES Cuautitlán (UNAM):
cruzar 7 materias contra 5 grupos distintos, cada uno con 2 o 3 sesiones a la semana,
es exactamente el tipo de problema combinatorio que una computadora hace mejor que una
persona con una libreta.

## Dos formas de armarlo

- **Modo automático** — dile tu ventana de horario y tus días libres; el motor prueba
  combinaciones y te regresa las mejores, rankeadas.
- **Modo manual** — inspirado en [armatushorarios.com](https://armatushorarios.com/), un
  proyecto estudiantil independiente que ya resuelve esto para las carreras de Campo 1 de
  FES Cuautitlán (mi misma escuela, Campo 4). Ese sitio apunta a mantener un catálogo
  curado a mano por carrera —"actualmente con las carreras de Campo 1"— en vez de que
  cada quien suba su propio PDF; el patrón de interacción que le tomé prestado es el más
  fuerte de esa categoría de herramientas: tú eliges el grupo de cada materia con un clic
  y el calendario se arma solo, marcando en rojo cualquier choque al instante. Aquí ese
  modo manual convive con el automático como alternativa cuando quieres control total
  —por ejemplo, para no soltar a un profesor específico aunque el horario no sea el más
  compacto— y con la ventaja de que, al venir de la misma base de datos normalizada,
  funciona para cualquier universidad que hayas subido, no solo para un catálogo que
  alguien más mantiene a mano.

## Cómo está pensado

El proyecto separa los dos problemas duros que tiene "arma mi horario" para que cada uno
se pueda mejorar sin tocar el otro:

1. **Leer el horario** (`src/lib/extract.ts`) — el PDF/imagen que publica cada universidad
   viene en un formato distinto: celdas fusionadas, renglones extra para el grupo de
   laboratorio ("1301" + "1301A"), columnas en otro orden, etc. En vez de escribir un
   parser de tablas a la medida de cada escuela, esto se lo pasa directo a la API de
   Claude (que lee imágenes y PDFs de forma nativa) con instrucciones claras de a qué
   esquema normalizar el resultado. Es el pedazo que hace que la misma herramienta sirva
   para otra universidad sin escribir código nuevo — solo depende de qué tan clara sea
   la tabla original.

2. **Armar el horario** (`src/lib/solver.ts` + `src/lib/conflicts.ts`) — una vez que los
   datos están en el esquema normalizado (`src/lib/types.ts`), esto ya no sabe ni le
   importa de qué universidad vinieron.
   - `solver.ts` es una búsqueda con backtracking para el modo automático: prueba una
     sección por materia, descarta de inmediato cualquier combinación con choque o que se
     salga de la ventana de horario pedida, y al final rankea lo que sí cumple por qué
     tan compacto es (menos huecos, menos días distintos en la escuela).
   - `conflicts.ts` es la misma lógica de choques, expuesta para el modo manual: en vez
     de descartar combinaciones, le dice a la interfaz exactamente cuáles dos materias
     chocan, qué día y en qué horas, para marcarlo en el calendario en tiempo real.

Ese esquema intermedio es la pieza que importa: cualquier universidad, una vez
normalizada a él, funciona con ambos modos.

## Qué tan "óptimo" es (modo automático)

- Ventana de horario y días libres son restricciones **duras**: si pides "nada antes de
  las 9am" y una materia solo tiene grupos que empiezan más temprano, esa combinación se
  descarta completa — no aparece disfrazada de "casi cumple".
- Entre las combinaciones que sí cumplen todo, se ordenan por menos tiempo muerto entre
  clases y menos días distintos pisando la escuela.
- Si no hay ninguna combinación que cumpla todo a la vez, te lo dice así de claro, en vez
  de inventar algo que casi funciona. El modo manual es la salida natural en ese caso:
  te deja ver exactamente dónde está el choque para decidir tú qué materia mover.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # agrega tu ANTHROPIC_API_KEY (console.anthropic.com)
npm run dev
```

Abre `http://localhost:3000`. Si no quieres configurar la API key todavía, hay un botón
para probar ambos modos directo con el ejemplo real de FES Cuautitlán 3er semestre
(`fixtures/fes-cuautitlan-3er-semestre.json`) sin subir nada.

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest — solver + detección de choques, contra datos reales
npm run build         # build de producción
```

## Estructura

```
src/
  lib/
    types.ts            esquema normalizado (Subject, Section, TimeBlock, Preferences...)
    time.ts               utilidades de tiempo (choques, huecos, formato)
    solver.ts              motor de búsqueda para el modo automático
    solver.test.ts          pruebas contra datos reales de FES Cuautitlán
    conflicts.ts             detección de choques para el modo manual
    conflicts.test.ts         pruebas de la detección de choques
    extract.ts                llamada a la API de Claude para leer el PDF/imagen
  app/
    page.tsx               flujo: subir → elegir modo automático o manual → resultados
    api/extract/            endpoint que recibe el archivo y llama a extract.ts
  components/
    UploadPanel.tsx           subir PDF/imagen
    PreferencesForm.tsx        materias, ventana de horario, días libres (modo automático)
    ResultsList.tsx              pestañas entre las opciones rankeadas (modo automático)
    ManualBuilder.tsx              elegir grupo por materia con un clic (modo manual)
    ScheduleGrid.tsx                calendario visual compartido por ambos modos —
                                      no sabe de qué universidad vienen los datos, y
                                      marca en rojo cualquier choque que reciba
fixtures/
  fes-cuautitlan-3er-semestre.json   dataset real de ejemplo — 7 materias, 32 secciones
```

## Estado actual — qué es MVP y qué falta

Esto es un punto de partida, no un producto terminado:

- El **motor de búsqueda y la detección de choques ya están probados en serio** (13
  pruebas) contra un caso real de 5 grupos con materias que se repiten en dos aulas
  distintas por semana (típico de las materias con laboratorio). Es la parte con más
  valor agregado del proyecto y en la que más vale invertir si algo se rompe.
- La **extracción por IA todavía no se probó de punta a punta con una API key real** —
  el código está completo y sigue el formato documentado de la API, pero cada universidad
  nueva es, en la práctica, el primer caso de prueba real de su formato. Espera tener
  que ajustar el prompt en `extract.ts` la primera vez que le des un PDF de otra escuela.
- Ya tiene una pasada de diseño real (tipografía, tokens de espaciado/color, estados de
  carga y error, drag-and-drop en la subida) en vez del gris genérico del primer borrador,
  pero sigue siendo una interfaz de trabajo, no una landing page pensada para convertir
  visitantes.
- No hay manejo de cuentas ni de guardar horarios entre sesiones — cada visita empieza
  de cero. El modo manual tampoco tiene todavía forma de agregar un grupo que no venga
  en el PDF original (por ejemplo, si de verdad quieres construir desde cero como en
  armatushorarios.com, sin subir nada) — hoy siempre parte de un dataset ya extraído o
  del ejemplo.

### Ideas para seguir

- Un catálogo compartido tipo `catalogs/` con datasets ya extraídos y verificados por
  escuela (empezando por el de FES Cuautitlán aquí incluido), para que la segunda persona
  de la misma universidad no tenga que volver a gastar tokens de extracción — la versión
  ligera, sin base de datos, de lo que armatushorarios.com hace con su catálogo curado.
  Encajaría bien como una carpeta a la que la gente le mande PRs directamente en GitHub.
  - **Nota importante:** antes de repartir cualquier catálogo así, hay que revisar los
    términos de uso de la fuente original (muchas facultades publican sus horarios sin
    licencia explícita) — este es un tema por resolver, no algo ya decidido.
- Permitir agregar/editar una sección a mano en el modo manual, para que sirva también
  sin haber subido ningún PDF.
  - Ligado a esto: dejar que el modo manual reciba subjects vacíos o parciales, no solo
    los que ya vinieron de un dataset extraído.
- Preferencia por profesor específico en el modo automático, o por evitar bloques
  mayores a cierta duración.
- Caché de extracción por hash del archivo, para no volver a gastar tokens si dos
  personas de la misma escuela suben el mismo PDF.
- Exportar el resultado a imagen/PDF o a un archivo `.ics` para importarlo al calendario.
- Guardar el progreso del modo manual (hoy se pierde si recargas la página).

## Stack

Next.js 15 (App Router) + TypeScript + React 19. Sin base de datos ni backend aparte:
el único servicio externo es la API de Claude, y solo se usa en el paso de lectura del
archivo — el resto corre en el navegador.
