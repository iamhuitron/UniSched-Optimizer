# horario-óptimo

Sube el PDF (o foto) de los horarios que publica tu universidad, dile tus restricciones —
a qué hora quieres entrar, a qué hora salir, qué días quieres libres— y te regresa las
mejores combinaciones de grupos posibles, sin choques. O si prefieres el control total,
arma tu horario a mano, grupo por grupo, y te avisamos en vivo si algo se empalma.

Todo corre local: la lectura del PDF/imagen no depende de ninguna API externa ni API key
— nada de lo que subas sale de tu propia máquina o de tu propio servidor.

Nació de armar a mano el horario de 3er semestre de Informática en FES Cuautitlán (UNAM):
cruzar 7 materias contra 5 grupos distintos, cada uno con 2 o 3 sesiones a la semana,
es exactamente el tipo de problema combinatorio que una computadora hace mejor que una
persona con una libreta.

## Dos formas de armarlo

- **Modo automático** — dile tu ventana de horario y tus días libres; el motor prueba
  combinaciones y te regresa las mejores, rankeadas.
- **Modo manual** — inspirado en [armatushorarios.com](https://armatushorarios.com/), un
  proyecto estudiantil independiente que ya resuelve esto para las carreras de Campo 1 de
  FES Cuautitlán (mi misma escuela, Campo 4). Tú eliges el grupo de cada materia con un
  clic y el calendario se arma solo, marcando en rojo cualquier choque al instante.

## Cómo lee el horario sin depender de una API de IA

El PDF/imagen que publica cada universidad viene en un formato distinto: celdas
fusionadas, renglones extra para el grupo de laboratorio ("1301" + "1301A"), columnas en
otro orden. Sin un modelo que "entienda" la tabla, la única opción realista es
reconstruirla geométricamente:

1. **`src/lib/local-parse/pdf.ts`** — si es un PDF con texto real (la gran mayoría de los
   horarios que publican las universidades, generados desde Word/Excel), usa
   [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) para leer cada fragmento de texto
   junto con su posición exacta en la página. Nada de OCR: esto es lectura directa y
   precisa del texto que ya está en el archivo.
2. **`src/lib/local-parse/image.ts`** — si es una foto o un PDF escaneado sin texto real,
   usa [`tesseract.js`](https://github.com/naptha/tesseract.js) (OCR, corre 100% local vía
   WebAssembly) para reconocer cada palabra y su posición. Es el mismo tipo de archivo que
   yo mismo subí originalmente para este proyecto.
3. **`src/lib/local-parse/table-to-dataset.ts`** — el corazón del asunto: agrupa ese texto
   posicionado en renglones por cercanía vertical, encuentra el renglón de encabezados
   (Clave/Asignatura/Cr/Grupo/Aula/Profesor/Lunes...Sábado) para anclar las columnas por
   posición horizontal, y de ahí arma cada materia/sección/horario. Ambos extractores
   (PDF y OCR) alimentan esta misma función, así que solo hay una lógica de
   reconstrucción de tabla que mantener y probar.

**Esto es un trade-off real, no una mejora gratis.** Sin un modelo de por medio, cualquier
documento que no siga razonablemente ese layout va a leerse mal o nada. Construyendo esto
encontré dos fallas concretas con pruebas de extremo a extremo (no solo pruebas
unitarias con datos sintéticos perfectos):

- Cuando dos celdas visualmente adyacentes no tienen suficiente espacio en blanco entre
  ellas, tanto `pdfjs-dist` como el OCR a veces las reportan como **un solo fragmento de
  texto fusionado** — un nombre de profesor largo puede fusionarse con el horario del
  lunes de al lado. `table-to-dataset.ts` detecta un horario "HH:MM-HH:MM" incrustado a
  la mitad de un fragmento y lo separa antes de asignarlo a su columna.
- Ese mismo problema puede pasarle al propio renglón de encabezados ("Miércoles" +
  "Jueves" fusionados en un solo fragmento) — mucho peor, porque entonces ninguna de las
  dos columnas queda anclada, y los datos de ambos días terminan asignados por accidente
  a la columna vecina más cercana. Ver los tests con comentario "(regression)" en
  `table-to-dataset.test.ts` para el caso exacto.

Ninguno de los dos es un problema resuelto de forma perfecta y general — son mitigaciones
concretas a fallas que sí ocurrieron probando con datos reales, documentadas donde están
por si hace falta seguir ajustándolas con el siguiente documento que falle.

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
npm run dev
```

Abre `http://localhost:3000`. No hace falta ninguna variable de entorno ni API key — todo
corre local. El botón "Explorar catálogo de universidades" tiene el ejemplo real de FES
Cuautitlán 3er semestre (`fixtures/fes-cuautitlan-3er-semestre.json`) listo para probar
ambos modos sin subir nada. El resto del catálogo (UNAM, IPN, UAM) está ahí como
estructura — marcado "próximamente" hasta que alguien suba y verifique el PDF real de esa
facultad. Ver ["Cómo agregar una universidad al catálogo"](#cómo-agregar-una-universidad-al-catálogo).

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest — incluye extracción real de un PDF y una imagen generados
                      # en la prueba (sin red, sin API): 30 pruebas en total
npm run build         # build de producción
```

## Estructura

```
src/
  lib/
    types.ts                    esquema normalizado (Subject, Section, TimeBlock, Preferences...)
    time.ts                       utilidades de tiempo (choques, huecos, formato)
    solver.ts                      motor de búsqueda para el modo automático
    solver.test.ts                  pruebas contra datos reales de FES Cuautitlán
    conflicts.ts                     detección de choques para el modo manual
    conflicts.test.ts                 pruebas de la detección de choques
    catalog.ts                         universidad → facultad → carrera con datasets verificados
    catalog.test.ts                     pruebas de integridad del catálogo
    local-parse/
      types.ts                           PositionedItem — el formato común entre PDF y OCR
      pdf.ts                               extracción de texto real vía pdfjs-dist
      image.ts                              OCR vía tesseract.js (100% local, sin red)
      table-to-dataset.ts                    reconstrucción geométrica de la tabla — el
                                               corazón del parser, ver sección de arriba
      table-to-dataset.test.ts                 pruebas con datos sintéticos, incluyendo
                                                 las dos fallas reales documentadas arriba
      pdf.test.ts, image.test.ts                extremo a extremo real: genera un PDF/imagen
                                                   de prueba y corre la extracción completa
      index.ts                                   junta pdf.ts/image.ts + table-to-dataset.ts
  app/
    page.tsx               flujo: subir o elegir del catálogo → modo automático o manual → resultados
    api/extract/            endpoint que recibe el archivo y llama a local-parse/index.ts
  components/
    UploadPanel.tsx           subir PDF/imagen, con drag-and-drop
    CatalogBrowser.tsx          explorar universidad → facultad → carrera y cargar un dataset ya verificado
    PreferencesForm.tsx           materias, ventana de horario, días libres (modo automático)
    ResultsList.tsx                  pestañas entre las opciones rankeadas (modo automático)
    ManualBuilder.tsx                  elegir grupo por materia con un clic (modo manual)
    ScheduleGrid.tsx                     calendario visual compartido por ambos modos —
                                           no sabe de qué universidad vienen los datos, y
                                           marca en rojo cualquier choque que reciba
fixtures/
  fes-cuautitlan-3er-semestre.json   único dataset real verificado por ahora — 7 materias, 32 secciones
```

## Cómo agregar una universidad al catálogo

1. Consigue el PDF o imagen oficial de horarios de tu facultad/carrera.
2. Súbelo en la app (modo automático o manual, cualquiera dispara la extracción) y revisa
   con cuidado que lo que salió sea correcto contra el documento original — la
   reconstrucción geométrica puede equivocarse, sobre todo en tablas con celdas
   fusionadas, columnas en otro orden, o fotos de baja calidad.
3. Guarda el JSON resultante como `fixtures/<universidad>-<facultad>-<carrera>.json`
   siguiendo la forma de `ScheduleDataset` en `src/lib/types.ts`, y cópialo también a
   `public/fixtures/` para que el navegador pueda cargarlo.
4. Agrega una entrada en `src/lib/catalog.ts`, dentro del `faculties` de la universidad
   correspondiente (o crea la universidad si no está listada todavía).
5. Antes de mandar el PR: revisa que tu facultad no tenga restricciones explícitas sobre
   redistribuir su horario — esto todavía no está resuelto de forma general, ver la nota
   en "Ideas para seguir".

## Estado actual — qué es MVP y qué falta

Esto es un punto de partida, no un producto terminado:

- El **motor de búsqueda, la detección de choques y el parser local ya están probados en
  serio** (30 pruebas). Las de `local-parse/` corren extracción real de extremo a extremo
  — un PDF de verdad generado en la prueba, una imagen de verdad pasada por OCR de
  verdad, no solo aserciones sobre datos ya estructurados — y ahí fue donde salieron los
  dos bugs reales documentados arriba.
- El parser está **calibrado contra un layout específico** (el de FES Cuautitlán, que es
  representativo de cómo la mayoría de las universidades mexicanas publican sus
  horarios). Una tabla con columnas en otro orden, sin encabezados claros, o con un
  layout muy distinto probablemente necesite ajustar `HEADER_ALIASES` o la heurística de
  columnas en `table-to-dataset.ts` — esto es exactamente el tipo de ajuste que vale la
  pena documentar como test cuando aparezca.
- El modo OCR es notablemente menos preciso que el de PDF con texto real — es inherente a
  cómo funciona el reconocimiento óptico, no algo que se resuelva solo con más tiempo en
  el prompt (ya no hay prompt). Para una foto de mala calidad, espera tener que corregir
  nombres de profesores u horarios a mano después.
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

- El catálogo (`src/lib/catalog.ts` + el botón "Explorar catálogo") ya tiene la mecánica
  completa — universidad → facultad → carrera, cargando un dataset verificado con un
  clic. Lo que falta es contenido: por ahora solo FES Cuautitlán tiene un dataset real;
  el resto de UNAM, IPN y UAM están listados a propósito como "próximamente" en vez de
  con datos inventados. Ver ["Cómo agregar una universidad al catálogo"](#cómo-agregar-una-universidad-al-catálogo) arriba.
  - **Nota importante, todavía sin resolver:** antes de aceptar un PR con el horario de
    otra facultad, hay que revisar los términos de uso de la fuente original — muchas
    publican sus horarios sin licencia explícita.
- Mejorar la heurística de reconstrucción de tabla conforme aparezcan más formatos reales
  — cada universidad nueva que falle es, en la práctica, el siguiente caso de prueba.
  Un layout con las materias en filas pero los grupos en columnas (en vez de al revés,
  como aquí), por ejemplo, todavía no está cubierto.
- Permitir agregar/editar una sección a mano en el modo manual, para que sirva también
  sin haber subido ningún PDF.
  - Ligado a esto: dejar que el modo manual reciba subjects vacíos o parciales, no solo
    los que ya vinieron de un dataset extraído.
- Preferencia por profesor específico en el modo automático, o por evitar bloques
  mayores a cierta duración.
- Exportar el resultado a imagen/PDF o a un archivo `.ics` para importarlo al calendario.
- Guardar el progreso del modo manual (hoy se pierde si recargas la página).

## Stack

Next.js 15 (App Router) + TypeScript + React 19. Sin base de datos ni servicio externo de
ningún tipo: la lectura de PDF/imagen (`pdfjs-dist` + `tesseract.js`) corre en el propio
servidor de Next.js, y el resto —el buscador de horarios y la detección de choques—
corre directo en el navegador.
