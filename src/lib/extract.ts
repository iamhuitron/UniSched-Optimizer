import Anthropic from '@anthropic-ai/sdk';
import type { ScheduleDataset } from './types';

/**
 * Model choice: extraction is a careful "read this messy merged-cell table and
 * get every row right" task, so this defaults to Sonnet rather than Haiku.
 * If accuracy is inconsistent on a particular university's layout (very dense
 * scans, handwriting, unusual table structure), try claude-opus-4-8 or
 * claude-fable-5 instead — same request shape, just a different model string.
 * All current Claude models accept image and PDF input directly.
 */
const DEFAULT_MODEL = process.env.ANTHROPIC_EXTRACT_MODEL || 'claude-sonnet-5';

const SYSTEM_PROMPT = `Lees tablas de horarios universitarios (México, aunque el formato varía por institución) y devuelves ÚNICAMENTE un JSON válido, sin texto antes ni después, sin \`\`\`.

El JSON debe tener esta forma exacta (TypeScript de referencia):

interface ScheduleDataset {
  institution: string;       // nombre de la universidad/facultad si aparece, si no "Desconocida"
  program?: string;          // carrera, si aparece
  term?: string;              // semestre, si aparece (ej. "3er semestre")
  subjects: {
    code: string;             // clave de la materia
    name: string;             // nombre de la materia, en minúsculas salvo la primera letra
    credits?: number;
    sections: {
      id: string;              // número de grupo (ej. "1301"). Si una materia tiene un renglón
                                // adicional tipo "1301A" para la misma clave y grupo base, es la
                                // MISMA sección — únelo en un solo objeto usando "1301" como id y
                                // agrega ese horario extra a "blocks", no crees una sección aparte.
      professor?: string;      // quita asteriscos u otros símbolos de anotación
      blocks: {
        day: number;            // 0=lunes, 1=martes, 2=miércoles, 3=jueves, 4=viernes, 5=sábado, 6=domingo
        start: string;          // "HH:MM" 24 horas
        end: string;            // "HH:MM" 24 horas
        room?: string;
      }[];
    }[];
  }[];
}

Reglas:
- Una celda con "-" o vacía significa que no hay clase ese día para esa fila: no generes un block para ella.
- Si una materia tiene el mismo código pero aparece en varios grupos (columnas "Grupo" distintas), cada grupo es una Section separada dentro de la misma Subject.
- Si el nombre de una materia se repite exactamente en distintas filas de un mismo grupo, agrupa esas filas en una sola Section como se explicó arriba.
- Ignora columnas irrelevantes (aula puede quedar vacía si no es clara, pero intenta capturarla).
- No inventes materias, grupos, profesores u horarios que no estén en la imagen/documento.
- Si de verdad no puedes leer algún dato, omite el campo opcional correspondiente en vez de adivinar.
- Devuelve TODAS las materias y TODOS los grupos que encuentres, no resumas ni recortes.`;

export interface ExtractOptions {
  model?: string;
  /** extra hint from the user, e.g. "esto es de la Facultad de Ingeniería de la UANL" */
  hint?: string;
}

export async function extractScheduleFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
  opts: ExtractOptions = {}
): Promise<ScheduleDataset> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta ANTHROPIC_API_KEY. Copia .env.example a .env.local y agrega tu API key de https://console.anthropic.com/'
    );
  }

  const client = new Anthropic({ apiKey });
  const base64 = fileBuffer.toString('base64');
  const isPdf = mimeType === 'application/pdf';

  const documentBlock = isPdf
    ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as const)
    : ({
        type: 'image',
        source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 },
      } as const);

  const message = await client.messages.create({
    model: opts.model || DEFAULT_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          documentBlock,
          {
            type: 'text',
            text: opts.hint
              ? `Contexto adicional del usuario: ${opts.hint}\n\nExtrae el JSON de esta tabla de horarios.`
              : 'Extrae el JSON de esta tabla de horarios.',
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    throw new Error('Claude no devolvió texto en la respuesta.');
  }

  const parsed = parseJsonResponse(textBlock.text);
  validateDataset(parsed);
  return { ...parsed, sourceFile: undefined, extractedAt: new Date().toISOString() };
}

function parseJsonResponse(raw: string): ScheduleDataset {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as ScheduleDataset;
  } catch (err) {
    throw new Error(
      `Claude no devolvió JSON válido. Primeros 300 caracteres de la respuesta: ${cleaned.slice(0, 300)}`
    );
  }
}

/** Cheap structural check — not a full schema validator, just enough to fail loudly
 *  and clearly instead of letting a malformed dataset reach the solver silently. */
function validateDataset(data: unknown): asserts data is ScheduleDataset {
  if (typeof data !== 'object' || data === null) throw new Error('El resultado no es un objeto JSON.');
  const d = data as Record<string, unknown>;
  if (typeof d.institution !== 'string') throw new Error('Falta "institution" en el JSON extraído.');
  if (!Array.isArray(d.subjects)) throw new Error('Falta el arreglo "subjects" en el JSON extraído.');
  for (const s of d.subjects) {
    if (typeof s.code !== 'string' || typeof s.name !== 'string' || !Array.isArray(s.sections)) {
      throw new Error(`Una materia quedó mal formada: ${JSON.stringify(s).slice(0, 200)}`);
    }
    for (const sec of s.sections) {
      if (typeof sec.id !== 'string' || !Array.isArray(sec.blocks)) {
        throw new Error(`Una sección quedó mal formada en "${s.name}": ${JSON.stringify(sec).slice(0, 200)}`);
      }
      for (const b of sec.blocks) {
        if (typeof b.day !== 'number' || typeof b.start !== 'string' || typeof b.end !== 'string') {
          throw new Error(`Un horario quedó mal formado en "${s.name}" / grupo ${sec.id}.`);
        }
      }
    }
  }
}
