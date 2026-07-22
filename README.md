# horario-óptimo

Sube el PDF (o foto) de los horarios que publica tu universidad, dile tus restricciones —
a qué hora quieres entrar, a qué hora salir, qué días quieres libres— y te regresa las
mejores combinaciones de grupos posibles, sin choques.

Nació de armar a mano el horario de 3er semestre de Informática en FES Cuautitlán (UNAM):
cruzar 7 materias contra 5 grupos distintos, cada uno con 2 o 3 sesiones a la semana,
es exactamente el tipo de problema combinatorio que una computadora hace mejor que una
persona con una libreta.

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

2. **Armar el horario** (`src/lib/solver.ts`) — una vez que los datos están en el esquema
   normalizado (`src/lib/types.ts`), esto ya no sabe ni le importa de qué universidad
   vinieron. Es una búsqueda con backtracking: prueba una sección por materia, descarta
   de inmediato cualquier combinación con choque o que se salga de la ventana de horario
   pedida, y al final rankea lo que sí cumple por qué tan compacto es (menos huecos,
   menos días distintos en la escuela). Para el tamaño real de este problema (unas 6-10
   materias, hasta una docena de grupos cada una) esto corre en milisegundos — no hace
   falta nada más pesado.

Ese esquema intermedio es la pieza que importa: cualquier universidad, una vez
normalizada a él, funciona con el mismo motor.

## Qué tan "óptimo" es

- Ventana de horario y días libres son restricciones **duras**: si pides "nada antes de
  las 9am" y una materia solo tiene grupos que empiezan más temprano, esa combinación se
  descarta completa — no aparece disfrazada de "casi cumple".
- Entre las combinaciones que sí cumplen todo, se ordenan por menos tiempo muerto entre
  clases y menos días distintos pisando la escuela.
- Si no hay ninguna combinación que cumpla todo a la vez, te lo dice así de claro, en vez
  de inventar algo que casi funciona.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # agrega tu ANTHROPIC_API_KEY (console.anthropic.com)
npm run dev
```

Abre `http://localhost:3000`. Si no quieres configurar la API key todavía, hay un botón
para probar el motor directo con el ejemplo real de FES Cuautitlán 3er semestre
(`fixtures/fes-cuautitlan-3er-semestre.json`) sin subir nada.

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest — corre el solver contra el ejemplo real de FES Cuautitlán
npm run build         # build de producción
```

## Estructura

```
src/
  lib/
    types.ts        esquema normalizado (Subject, Section, TimeBlock, Preferences...)
    time.ts          utilidades de tiempo (choques, huecos, formato)
    solver.ts        el motor de búsqueda
    solver.test.ts   pruebas contra datos reales de FES Cuautitlán
    extract.ts        llamada a la API de Claude para leer el PDF/imagen
  app/
    page.tsx           flujo de 3 pasos: subir → restricciones → resultados
    api/extract/       endpoint que recibe el archivo y llama a extract.ts
  components/
    UploadPanel.tsx      subir PDF/imagen
    PreferencesForm.tsx   materias, ventana de horario, días libres
    ResultsList.tsx        pestañas entre las opciones rankeadas
    ScheduleGrid.tsx        el calendario visual (genérico, no sabe de qué universidad viene)
fixtures/
  fes-cuautitlan-3er-semestre.json   dataset real de ejemplo — 7 materias, 32 secciones
```

## Estado actual — qué es MVP y qué falta

Esto es un punto de partida, no un producto terminado:

- El **motor de búsqueda ya está probado en serio** contra un caso real de 5 grupos con
  materias que se repiten en dos aulas distintas por semana (típico de las materias con
  laboratorio). Es la parte con más valor agregado del proyecto y en la que más vale
  invertir si algo se rompe.
- La **extracción por IA todavía no se probó de punta a punta con una API key real** —
  el código está completo y sigue el formato documentado de la API, pero cada universidad
  nueva es, en la práctica, el primer caso de prueba real de su formato. Espera tener
  que ajustar el prompt en `extract.ts` la primera vez que le des un PDF de otra escuela.
- El diseño es **funcional, no pulido** — sirve para probar la idea, no está pensado
  todavía como landing page.
- No hay manejo de cuentas ni de guardar horarios entre sesiones — cada visita empieza
  de cero.

### Ideas para seguir

- Guardar/comparar varios PDFs de la misma escuela (grupos matutino/vespertino) en una
  sola búsqueda, como se hizo a mano para FES Cuautitlán antes de este proyecto.
- Preferencia por profesor específico, o por evitar bloques mayores a cierta duración.
- Caché de extracción por hash del archivo, para no volver a gastar tokens si dos
  personas de la misma escuela suben el mismo PDF.
- Exportar el resultado a imagen/PDF o a un archivo `.ics` para importarlo al calendario.

## Stack

Next.js 15 (App Router) + TypeScript + React 19. Sin base de datos ni backend aparte:
el único servicio externo es la API de Claude, y solo se usa en el paso de lectura del
archivo — el resto corre en el navegador.
