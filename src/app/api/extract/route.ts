import { NextResponse } from 'next/server';
import { extractScheduleLocally } from '@/lib/local-parse';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo enviado.' }, { status: 400 });
  }

  const file = form.get('file');
  const hint = form.get('hint');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo ("file") en el formulario.' }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo de archivo no soportado: ${file.type}. Usa PDF, JPG, PNG o WEBP.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo pesa más de 15MB.' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const institutionHint = typeof hint === 'string' && hint.trim() ? hint.trim() : undefined;
    const { dataset, warnings } = await extractScheduleLocally(buffer, file.type, {
      institution: institutionHint,
    });

    if (dataset.subjects.length === 0) {
      return NextResponse.json(
        {
          error:
            'No se pudo reconstruir ninguna materia de este archivo. Revisa que sea una tabla con columnas Clave/Asignatura/Grupo/Lunes...Sábado, o inténtalo con una imagen más clara.',
          warnings,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ dataset: { ...dataset, sourceFile: file.name }, warnings });
  } catch (err) {
    console.error('extract route error:', err);
    const message = err instanceof Error ? err.message : 'Error desconocido al leer el horario.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
