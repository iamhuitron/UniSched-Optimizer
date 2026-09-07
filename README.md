# UniSched Optimizer (Horario Óptimo)

<p align="left">
  <strong>Deterministic Combinatorial Course Schedule Solver & Client-Side OCR Parser</strong><br>
  Open-Source Engineering by <a href="https://github.com/iamhuitron"><strong>Ian Miguel Delgado Huitrón</strong></a> · UNAM (FES Cuautitlán)
</p>

<p align="left">
  <a href="https://uni-sched-optimizer.vercel.app/"><img src="https://img.shields.io/badge/Live_Application-uni--sched--optimizer.vercel.app-2563eb?style=flat-square&logo=vercel&logoColor=white" alt="Live App" /></a>
  <a href="https://github.com/iamhuitron"><img src="https://img.shields.io/badge/Author-@iamhuitron-1e293b?style=flat-square&logo=github&logoColor=white" alt="Author" /></a>
  <a href="https://github.com/Xaol-Studio"><img src="https://img.shields.io/badge/Studio-@Xaol--Studio-059669?style=flat-square&logo=github&logoColor=white" alt="Studio" /></a>
  <img src="https://img.shields.io/badge/Algorithm-Backtracking%20%2F%20CSP-purple?style=flat-square" alt="Algorithm" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Client--Side%20(Wasm%20OCR)-emerald?style=flat-square" alt="Privacy" />
</p>

---

## 📌 Descripción General

Sube el PDF (o foto) de los horarios que publica tu universidad, dile tus restricciones —
a qué hora quieres entrar, a qué hora salir, qué días quieres libres— y te regresa las
mejores combinaciones de grupos posibles, sin choques. O si prefieres el control total,
arma tu horario a mano, grupo por grupo, y te avisamos en vivo si algo se empalma.

> **100% Local y Privado:** La lectura del PDF/imagen no depende de ninguna API externa ni API key — nada de lo que subas sale de tu propia máquina o navegador.

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
                      # en la prueba (sin red, sin API): 31 pruebas en total
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
  fes-cuautitlan-3er-semestre.json                dataset real — Informática, 3er semestre
  fes-cuautitlan-informatica-1er-semestre.json      dataset real — 1er semestre
  fes-cuautitlan-informatica-4o-semestre.json        dataset real — 4to semestre
  fes-cuautitlan-informatica-5o-semestre.json         dataset real — 5to semestre
  fes-cuautitlan-informatica-7o-semestre.json          dataset real — 7mo semestre
  fes-cuautitlan-informatica-9o-semestre.json           dataset real — 9no semestre
```

Los seis salieron de la fuente oficial: FES Cuautitlán publica los horarios de sus 17
carreras en `masam.cuautitlan.unam.mx/horarios/`, mismo formato de tabla que ya soporta
el parser. Los de 1er/4to/5to/7mo/9no semestre se armaron con un script de una sola vez
(regex sobre el texto ya extraído del PDF oficial, no manualmente materia por materia) y
se verificaron cruzando varias filas contra la fuente y contra el semestre 3° —que ya
estaba armado a mano desde antes— para confirmar que coincidían exactamente. El resto de
las 16 carreras de FES Cuautitlán (Química, Contaduría, Ingeniería Industrial, etc.) están
en el mismo portal, con el mismo formato, listas para que alguien repita el proceso.

## Cómo agregar una universidad al catálogo

**Antes que nada, busca un portal oficial en vez de partir de una sola foto.** El salto
más grande que dio este catálogo no vino de subir PDFs uno por uno, sino de encontrar que
FES Cuautitlán publica los horarios de sus 17 carreras completas en un solo portal
(`masam.cuautitlan.unam.mx/horarios/`) — una búsqueda de "[tu universidad] horarios
coordinación pdf [semestre actual]" frecuentemente encuentra algo parecido: una página de
"coordinación de la licenciatura en X" con un PDF por carrera, actualizado cada semestre.
Encontrar eso primero convierte "agregar una carrera" en "agregar 15", porque el mismo
formato de tabla suele repetirse entre todas las carreras de una misma facultad.

Con el PDF/imagen en mano:

1. Súbelo en la app (modo automático o manual, cualquiera dispara la extracción) y revisa
   con cuidado que lo que salió sea correcto contra el documento original — la
   reconstrucción geométrica puede equivocarse, sobre todo en tablas con celdas
   fusionadas, columnas en otro orden, o fotos de baja calidad. Para un portal con muchos
   PDFs del mismo formato, vale la pena escribir un script una sola vez (como se hizo para
   los semestres 1°/4°/5°/7°/9° de Informática: un regex sobre el texto ya extraído,
   verificado cruzando filas contra la fuente) en vez de subir cada uno a mano.
2. Guarda el JSON resultante como `fixtures/<universidad>-<facultad>-<carrera>.json`
   siguiendo la forma de `ScheduleDataset` en `src/lib/types.ts`, y cópialo también a
   `public/fixtures/` para que el navegador pueda cargarlo.
3. Agrega una entrada en `src/lib/catalog.ts`, dentro del `faculties` de la universidad
   correspondiente (o crea la universidad si no está listada todavía). Si ya existe una
   entrada para esa carrera sin `datasetPath` (aparece como "Próximamente"), solo agrégale
   el campo — no hace falta borrar nada.
4. Antes de mandar el PR: revisa que tu facultad no tenga restricciones explícitas sobre
   redistribuir su horario — esto todavía no está resuelto de forma general, ver la nota
   en "Ideas para seguir".

## Estado actual y capacidades

- El **motor de búsqueda, la detección de choques y el parser local cuentan con 35 pruebas unitarias y de integración**.
- **Parser Multi-Formato**: Soporta tanto tablas con columnas por día individuales (`Lunes | Martes | Miércoles...`) como tablas con columnas combinadas (`Días: L, M, V` + `Horario: 07:00-09:00` o rangos de días `L-V`).
- **Catálogo Expandido**: Incluye facultades y carreras reales de **UNAM** (FES Cuautitlán, FI CU, FES Acatlán, FES Aragón, Ciencias, Iztacala, Zaragoza), **IPN** (ESCOM, UPIICSA, ESIME Zacatenco) y **UAM** (Azcapotzalco, Iztapalapa, Xochimilco, Cuajimalpa), con datasets verificados listos para cargar con 1 clic.
- **Constructor Manual desde Cero**: Permite armar horarios agregando materias, grupos, días y rangos de horario a mano sin necesidad de subir un PDF, o complementar materias sobre un horario ya extraído.
- **Sistema de Scraping Automático**: Incluye script CLI (`npm run scrape:catalog`) y GitHub Action (`.github/workflows/auto-scrape.yml`) programado semanalmente para verificar y actualizar portales oficiales de horarios.

  mayores a cierta duración.
- Exportar el resultado a imagen/PDF o a un archivo `.ics` para importarlo al calendario.
- Guardar el progreso del modo manual (hoy se pierde si recargas la página).

## Stack

Next.js 15 (App Router) + TypeScript + React 19. Sin base de datos ni servicio externo de
ningún tipo: la lectura de PDF/imagen (`pdfjs-dist` + `tesseract.js`) corre en el propio
servidor de Next.js, y el resto —el buscador de horarios y la detección de choques—
corre directo en el navegador.
